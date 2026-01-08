# Builder Company - Construction Accounting System

A comprehensive accounting and project management system for construction companies. Built with Django REST Framework backend and React frontend.

## Features

- **Project Management**: Create and manage construction projects with budgets, timelines, and progress tracking
- **Invoice Management**: Issue and track invoices (vydane/prijate faktury) with PDF generation
- **Warehouse Management**: Material inventory, stock receipts (prijemky), write-offs (vydejky)
- **Financial Reports**: Profit/loss analysis, cash flow, project profitability
- **User Roles**: Admin, Manager, Accountant, Warehouse Staff, Worker with granular permissions
- **Notifications**: Email alerts for due dates, low stock, overdue invoices
- **Multi-language**: Czech language UI

## Tech Stack

### Backend
- Python 3.11+
- Django 4.2+
- Django REST Framework
- PostgreSQL (or SQLite for development)
- Celery + Redis (for background tasks)
- JWT Authentication

### Frontend
- React 18
- TypeScript
- Vite
- Ant Design 5
- TanStack Query (React Query)
- Zustand (state management)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd builder_company

# Copy environment file
cp .env.example .env

# Edit .env with your settings
nano .env

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Seed demo data (optional)
docker-compose exec backend python manage.py seed_demo_data

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/api/v1/
# Admin: http://localhost:8000/admin/
```

### Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=sqlite:///db.sqlite3
export DJANGO_SETTINGS_MODULE=config.settings.dev
export SECRET_KEY=your-secret-key-here

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Seed demo data (optional)
python manage.py seed_demo_data

# Run development server
python manage.py runserver
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set API URL
export VITE_API_URL=http://localhost:8000/api/v1

# Run development server
npm run dev
```

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | `your-secret-key-here` |
| `DATABASE_URL` | Database connection string | `postgres://user:pass@localhost:5432/builder` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,builder.example.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable debug mode | `False` |
| `CELERY_BROKER_URL` | Redis URL for Celery | `redis://localhost:6379/0` |
| `EMAIL_HOST` | SMTP server host | `localhost` |
| `VITE_API_URL` | Backend API URL for frontend | `http://localhost:8000/api/v1` |

## API Documentation

### Authentication

All API endpoints (except login) require JWT authentication:

```bash
# Login
curl -X POST http://localhost:8000/api/v1/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo.cz", "password": "demo123"}'

# Use token in requests
curl http://localhost:8000/api/v1/projects/ \
  -H "Authorization: Bearer <access_token>"
```

### Main Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/users/login/` | User authentication |
| `GET /api/v1/projects/` | List projects |
| `GET /api/v1/invoices/` | List invoices |
| `GET /api/v1/warehouse/materials/` | List materials |
| `GET /api/v1/warehouse/stock-report/` | Stock report |
| `GET /api/v1/reports/` | Financial reports |
| `GET /api/v1/settings/company/` | Company settings |

## User Roles & Permissions

| Role | Projects | Invoices | Warehouse | Reports | Settings |
|------|----------|----------|-----------|---------|----------|
| Admin | Full | Full | Full | Full | Full |
| Manager | Full | Read + Create | Read + Create Writeoffs | Full | Read |
| Accountant | Read | Full | Read | Full | Read |
| Warehouse | Read | Read | Full | Read | Read |
| Worker | Read | - | Read | - | - |

## Demo Users

After running `python manage.py seed_demo_data`:

| Email | Password | Role |
|-------|----------|------|
| admin@demo.cz | demo123 | Admin |
| manager@demo.cz | demo123 | Manager |
| accountant@demo.cz | demo123 | Accountant |
| warehouse@demo.cz | demo123 | Warehouse |
| worker@demo.cz | demo123 | Worker |

## Production Deployment

```bash
# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

### Nginx Configuration

The production setup includes Nginx as a reverse proxy with:
- SSL/TLS support
- Static file serving
- Gzip compression
- Security headers

## Project Structure

```
builder_company/
├── backend/
│   ├── apps/
│   │   ├── users/        # Authentication & user management
│   │   ├── projects/     # Project & supplier management
│   │   ├── invoices/     # Invoice management
│   │   ├── warehouse/    # Stock management
│   │   ├── reports/      # Financial reports
│   │   ├── settings/     # Company settings
│   │   └── notifications/# Email notifications
│   ├── config/           # Django settings
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/          # API clients
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── store/        # Zustand stores
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
│   └── package.json
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

## Background Tasks (Celery)

The following tasks run automatically:

| Task | Schedule | Description |
|------|----------|-------------|
| `check_low_stock` | Daily 8:00 | Alert on low stock materials |
| `check_overdue_invoices` | Daily 9:00 | Alert on overdue invoices |
| `send_due_reminders` | Daily 10:00 | Send payment reminders |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary software. All rights reserved.
