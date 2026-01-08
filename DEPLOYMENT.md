# Production Deployment Guide

Покрокова інструкція для деплою Builder Company на VPS (DigitalOcean, Hetzner, тощо).

## Зміст
1. [Підготовка сервера](#1-підготовка-сервера)
2. [Налаштування домену і SSL](#2-налаштування-домену-і-ssl)
3. [Деплой додатку](#3-деплой-додатку)
4. [Backup бази даних](#4-backup-бази-даних)
5. [Оновлення (CI/CD)](#5-оновлення-cicd)
6. [Моніторинг і логи](#6-моніторинг-і-логи)

---

## 1. Підготовка сервера

### 1.1 Створення Droplet на DigitalOcean

1. Зайдіть на [DigitalOcean](https://digitalocean.com)
2. Create Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic, $12/mo (2GB RAM, 1 vCPU) - мінімум для production
   - **Region**: Frankfurt (найближчий до Чехії)
   - **Authentication**: SSH Key (рекомендовано)

### 1.2 Початкове налаштування сервера

```bash
# Підключаємось до сервера
ssh root@YOUR_SERVER_IP

# Оновлюємо систему
apt update && apt upgrade -y

# Створюємо користувача (не працюємо від root)
adduser deploy
usermod -aG sudo deploy

# Копіюємо SSH ключ для нового користувача
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Налаштовуємо firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Перелогінюємось як deploy
exit
ssh deploy@YOUR_SERVER_IP
```

### 1.3 Встановлення Docker

```bash
# Встановлюємо Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Додаємо користувача до групи docker
sudo usermod -aG docker deploy

# Перелогінюємось щоб застосувати групу
exit
ssh deploy@YOUR_SERVER_IP

# Перевіряємо
docker --version
docker compose version
```

### 1.4 Встановлення додаткових утиліт

```bash
# Git, htop, та інші корисні утиліти
sudo apt install -y git htop curl wget nano

# Fail2ban для захисту від brute-force
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 2. Налаштування домену і SSL

### 2.1 DNS налаштування

У вашого DNS провайдера (Cloudflare, DigitalOcean DNS, тощо):

```
Type    Name              Value
A       builder           YOUR_SERVER_IP
A       www.builder       YOUR_SERVER_IP
```

### 2.2 Nginx конфігурація

Створіть файл `nginx/conf.d/default.conf`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name builder.example.com www.builder.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name builder.example.com www.builder.example.com;

    # SSL certificates (будуть створені certbot)
    ssl_certificate /etc/letsencrypt/live/builder.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/builder.example.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # Frontend (React app)
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location /static/ {
        alias /var/www/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /var/www/media/;
        expires 7d;
    }

    # Max upload size
    client_max_body_size 20M;
}
```

### 2.3 Отримання SSL сертифіката

```bash
# Створюємо директорії
mkdir -p ~/builder_company/certbot/conf
mkdir -p ~/builder_company/certbot/www
mkdir -p ~/builder_company/nginx/conf.d

# Спочатку запускаємо без SSL для отримання сертифіката
# Тимчасова nginx конфігурація (тільки HTTP)
cat > ~/builder_company/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name builder.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Запускаємо тільки nginx
docker run -d --name nginx-temp \
    -p 80:80 \
    -v ~/builder_company/nginx/conf.d:/etc/nginx/conf.d:ro \
    -v ~/builder_company/certbot/www:/var/www/certbot:ro \
    nginx:alpine

# Отримуємо сертифікат
docker run -it --rm \
    -v ~/builder_company/certbot/conf:/etc/letsencrypt \
    -v ~/builder_company/certbot/www:/var/www/certbot \
    certbot/certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email your@email.com \
    --agree-tos \
    --no-eff-email \
    -d builder.example.com

# Зупиняємо тимчасовий nginx
docker stop nginx-temp && docker rm nginx-temp

# Тепер можна використовувати повну конфігурацію з SSL
```

---

## 3. Деплой додатку

### 3.1 Клонування репозиторію

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/builder_company.git
cd builder_company
```

### 3.2 Налаштування environment

```bash
# Копіюємо приклад
cp .env.example .env

# Редагуємо
nano .env
```

**Важливі налаштування для production:**

```bash
# .env файл для production
SECRET_KEY=your-very-long-random-secret-key-here-minimum-50-chars
DEBUG=False
ALLOWED_HOSTS=builder.example.com,www.builder.example.com
DJANGO_SETTINGS_MODULE=config.settings.prod

# Database
POSTGRES_DB=builder_company
POSTGRES_USER=builder
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE_32_CHARS
DATABASE_URL=postgres://builder:STRONG_PASSWORD_HERE_32_CHARS@postgres:5432/builder_company

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# Email (використовуйте реальний SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Builder Company <noreply@builder.example.com>

# CORS
CORS_ALLOWED_ORIGINS=https://builder.example.com

# Frontend
VITE_API_URL=https://builder.example.com/api/v1
```

**Генерація SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 3.3 Перший запуск

```bash
# Збираємо images
docker compose -f docker-compose.prod.yml build

# Запускаємо
docker compose -f docker-compose.prod.yml up -d

# Перевіряємо статус
docker compose -f docker-compose.prod.yml ps

# Запускаємо міграції
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Збираємо статичні файли
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Створюємо суперюзера
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# (Опціонально) Завантажуємо демо-дані
docker compose -f docker-compose.prod.yml exec backend python manage.py seed_demo_data
```

### 3.4 Перевірка

```bash
# Перевіряємо логи
docker compose -f docker-compose.prod.yml logs -f

# Перевіряємо health
curl -I https://builder.example.com
curl https://builder.example.com/api/v1/health/
```

---

## 4. Backup бази даних

### 4.1 Скрипт бекапу

Створіть файл `scripts/backup.sh`:

```bash
#!/bin/bash
# scripts/backup.sh

set -e

# Налаштування
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
CONTAINER_NAME="builder_postgres_prod"

# Створюємо директорію якщо немає
mkdir -p $BACKUP_DIR

# Робимо бекап
echo "Starting backup..."
docker exec $CONTAINER_NAME pg_dump -U builder builder_company | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# Перевіряємо розмір
BACKUP_SIZE=$(ls -lh "$BACKUP_DIR/backup_$DATE.sql.gz" | awk '{print $5}')
echo "Backup created: backup_$DATE.sql.gz ($BACKUP_SIZE)"

# Видаляємо старі бекапи
echo "Cleaning old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Список існуючих бекапів
echo "Current backups:"
ls -lh $BACKUP_DIR/backup_*.sql.gz 2>/dev/null || echo "No backups found"

echo "Backup completed!"
```

```bash
chmod +x scripts/backup.sh
```

### 4.2 Автоматичний бекап (cron)

```bash
# Відкриваємо crontab
crontab -e

# Додаємо (бекап щодня о 3:00 ночі)
0 3 * * * /home/deploy/builder_company/scripts/backup.sh >> /home/deploy/backups/backup.log 2>&1
```

### 4.3 Відновлення з бекапу

```bash
# Розпаковуємо і відновлюємо
gunzip -c /home/deploy/backups/backup_20250108_030000.sql.gz | \
docker exec -i builder_postgres_prod psql -U builder builder_company
```

### 4.4 Бекап на зовнішнє сховище (S3/Backblaze)

```bash
# Встановлюємо rclone
curl https://rclone.org/install.sh | sudo bash

# Налаштовуємо (інтерактивно)
rclone config
# Обираємо: s3, backblaze, або інший провайдер

# Додаємо в скрипт бекапу:
rclone copy "$BACKUP_DIR/backup_$DATE.sql.gz" remote:builder-backups/
```

---

## 5. Оновлення (CI/CD)

### 5.1 Manual оновлення

```bash
# scripts/deploy.sh
#!/bin/bash
set -e

cd /home/deploy/builder_company

echo "=== Pulling latest changes ==="
git pull origin main

echo "=== Building images ==="
docker compose -f docker-compose.prod.yml build

echo "=== Creating backup before deploy ==="
./scripts/backup.sh

echo "=== Stopping services ==="
docker compose -f docker-compose.prod.yml down

echo "=== Starting services ==="
docker compose -f docker-compose.prod.yml up -d

echo "=== Running migrations ==="
docker compose -f docker-compose.prod.yml exec -T backend python manage.py migrate

echo "=== Collecting static files ==="
docker compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

echo "=== Deployment completed! ==="
docker compose -f docker-compose.prod.yml ps
```

### 5.2 GitHub Actions CI/CD

Створіть `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /home/deploy/builder_company
            ./scripts/deploy.sh
```

**Налаштування secrets в GitHub:**
- `SERVER_HOST`: IP вашого сервера
- `SERVER_USER`: `deploy`
- `SSH_PRIVATE_KEY`: Приватний SSH ключ

### 5.3 Zero-downtime deployment

Для production без простоїв використовуйте rolling update:

```bash
# Оновлюємо тільки backend (без зупинки)
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend

# Перевіряємо health
sleep 10
curl -f https://builder.example.com/api/v1/health/ || exit 1
```

---

## 6. Моніторинг і логи

### 6.1 Перегляд логів

```bash
# Всі логи
docker compose -f docker-compose.prod.yml logs -f

# Тільки backend
docker compose -f docker-compose.prod.yml logs -f backend

# Тільки помилки
docker compose -f docker-compose.prod.yml logs -f backend 2>&1 | grep -i error

# Останні 100 рядків
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

### 6.2 Моніторинг ресурсів

```bash
# Використання ресурсів контейнерами
docker stats

# Дисковий простір
df -h
docker system df

# Очищення невикористаних images
docker system prune -a
```

### 6.3 Health check endpoint

Додайте в `backend/config/urls.py`:

```python
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('api/v1/health/', health_check),
    # ... інші urls
]
```

### 6.4 Uptime моніторинг (безкоштовні сервіси)

- **UptimeRobot** (uptimerobot.com) - 50 моніторів безкоштовно
- **Healthchecks.io** - моніторинг cron jobs
- **Better Uptime** (betterstack.com)

Налаштуйте перевірку:
- `https://builder.example.com` - Frontend
- `https://builder.example.com/api/v1/health/` - Backend API

### 6.5 Логування помилок (Sentry)

1. Зареєструйтесь на [sentry.io](https://sentry.io)
2. Створіть проект Django
3. Додайте в `requirements.txt`:
   ```
   sentry-sdk[django]
   ```
4. Налаштуйте в `settings/prod.py`:
   ```python
   import sentry_sdk

   sentry_sdk.init(
       dsn=os.environ.get('SENTRY_DSN'),
       environment='production',
       traces_sample_rate=0.1,
   )
   ```

### 6.6 Простий моніторинг скрипт

```bash
# scripts/monitor.sh
#!/bin/bash

# Перевіряємо чи всі контейнери запущені
RUNNING=$(docker compose -f docker-compose.prod.yml ps --format json | jq -r '.[].State' | grep -c "running")
EXPECTED=6  # кількість сервісів

if [ "$RUNNING" -lt "$EXPECTED" ]; then
    echo "ALERT: Only $RUNNING/$EXPECTED containers running!"
    # Тут можна додати відправку email/telegram
fi

# Перевіряємо health endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://builder.example.com/api/v1/health/)
if [ "$HTTP_CODE" != "200" ]; then
    echo "ALERT: Health check failed! HTTP $HTTP_CODE"
fi

# Перевіряємо диск
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "ALERT: Disk usage is ${DISK_USAGE}%!"
fi
```

Додайте в cron (кожні 5 хвилин):
```bash
*/5 * * * * /home/deploy/builder_company/scripts/monitor.sh >> /home/deploy/monitor.log 2>&1
```

---

## Чеклист перед запуском

- [ ] Сервер налаштований (firewall, користувач, Docker)
- [ ] DNS записи створені
- [ ] SSL сертифікат отримано
- [ ] `.env` файл з production налаштуваннями
- [ ] `SECRET_KEY` згенеровано (унікальний, довгий)
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` налаштовано
- [ ] Email налаштовано і працює
- [ ] Superuser створено
- [ ] Бекапи налаштовано і протестовано
- [ ] Моніторинг налаштовано
- [ ] Логи доступні

---

## Корисні команди

```bash
# Перезапуск всіх сервісів
docker compose -f docker-compose.prod.yml restart

# Перезапуск одного сервісу
docker compose -f docker-compose.prod.yml restart backend

# Вхід в контейнер
docker compose -f docker-compose.prod.yml exec backend bash

# Django shell
docker compose -f docker-compose.prod.yml exec backend python manage.py shell

# Перегляд міграцій
docker compose -f docker-compose.prod.yml exec backend python manage.py showmigrations

# Очистка Docker
docker system prune -a --volumes
```

---

## Troubleshooting

### Проблема: 502 Bad Gateway
```bash
# Перевірте чи backend запущений
docker compose -f docker-compose.prod.yml ps backend
docker compose -f docker-compose.prod.yml logs backend
```

### Проблема: Static files не завантажуються
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### Проблема: Database connection refused
```bash
# Перевірте чи postgres запущений
docker compose -f docker-compose.prod.yml ps postgres
docker compose -f docker-compose.prod.yml logs postgres
```

### Проблема: SSL certificate expired
```bash
# Поновлення сертифіката
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```
