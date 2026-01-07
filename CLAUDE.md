# Builder Company - Construction Accounting System

## Project Overview

A web application for managing warehouse, projects, invoices, and reporting for a construction company based in Czech Republic.

## Tech Stack

### Backend
- **Python 3.12** with **Django 5.1** and **Django REST Framework 3.15**
- **PostgreSQL 16** - Primary database
- **Redis 7** - Caching and Celery broker
- **Celery 5.4** - Background task processing
- **WeasyPrint** - PDF generation

### Frontend
- **React 18** with **TypeScript**
- **Vite** - Build tool
- **Ant Design 5** - UI components
- **TanStack Query (React Query)** - Server state management
- **Zustand** - Client state management
- **React Router 6** - Routing
- **Recharts** - Charts and graphs

### Infrastructure
- **Docker** + **Docker Compose**
- **Nginx** (production)

## Project Structure

```
project/
├── docker-compose.yml          # Development environment
├── docker-compose.prod.yml     # Production environment
├── .env.example                # Environment variables template
├── backend/
│   ├── Dockerfile
│   ├── requirements/
│   │   ├── base.txt           # Common dependencies
│   │   ├── dev.txt            # Development dependencies
│   │   └── prod.txt           # Production dependencies
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py        # Common settings
│   │   │   ├── dev.py         # Development settings
│   │   │   └── prod.py        # Production settings
│   │   ├── urls.py            # Root URL configuration
│   │   ├── celery.py          # Celery configuration
│   │   └── wsgi.py            # WSGI application
│   ├── apps/
│   │   ├── users/             # User management & authentication
│   │   ├── warehouse/         # Warehouse & materials management
│   │   ├── projects/          # Project management
│   │   ├── invoices/          # Invoice management
│   │   ├── reports/           # Reporting module
│   │   ├── settings_app/      # Application settings
│   │   └── notifications/     # Notification system
│   ├── core/
│   │   ├── mixins.py          # Common model mixins
│   │   ├── pagination.py      # Custom pagination
│   │   ├── permissions.py     # Role-based permissions
│   │   └── exceptions.py      # Custom exceptions
│   └── manage.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── api/               # API client and endpoints
│       ├── components/        # React components
│       │   ├── common/        # Shared components
│       │   └── layout/        # Layout components
│       ├── pages/             # Page components
│       ├── hooks/             # Custom React hooks
│       ├── store/             # Zustand stores
│       ├── types/             # TypeScript type definitions
│       ├── utils/             # Utility functions
│       ├── App.tsx            # Main application component
│       └── main.tsx           # Application entry point
└── nginx/
    └── nginx.conf             # Nginx configuration
```

## Development Setup

### Prerequisites
- Docker and Docker Compose installed
- Git

### Quick Start

1. Clone the repository
2. Copy environment file:
   ```bash
   cp .env.example .env
   ```
3. Start all services:
   ```bash
   docker-compose up -d
   ```
4. Run migrations:
   ```bash
   docker-compose exec backend python manage.py migrate
   ```
5. Create superuser:
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

### Access Points
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/v1/
- API Docs: http://localhost:8000/api/docs/
- Django Admin: http://localhost:8000/admin/

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | Administrator | Full access to everything |
| `manager` | Manager | Projects, invoices, material write-offs |
| `accountant` | Accountant | Invoices, finances, reports |
| `warehouse` | Warehouse staff | Full warehouse access |
| `worker` | Worker | Read-only access |

## API Endpoints

### Authentication
- `POST /api/v1/users/auth/login/` - User login
- `POST /api/v1/users/auth/logout/` - User logout
- `POST /api/v1/users/auth/refresh/` - Refresh access token
- `GET /api/v1/users/me/` - Get current user
- `PATCH /api/v1/users/me/` - Update current user
- `POST /api/v1/users/me/change-password/` - Change password

### Users (Admin only)
- `GET /api/v1/users/` - List users
- `POST /api/v1/users/` - Create user
- `GET /api/v1/users/{id}/` - Get user
- `PATCH /api/v1/users/{id}/` - Update user
- `DELETE /api/v1/users/{id}/` - Delete user

## Key Features (Planned)

### Warehouse Module
- Materials CRUD with categories
- Stock receipts (nadhodení na sklad)
- Stock write-offs (odepsání ze skladu)
- Inventory management
- Low stock alerts

### Projects Module
- Project management with client data
- ARES integration (Czech business registry)
- Project finances tracking
- Document attachments
- Status workflow

### Invoices Module
- Invoice generation
- Payment tracking
- PDF export (Czech/English)
- Automatic status updates
- Due date reminders

### Reports Module
- Dashboard with KPIs
- Project reports
- Financial reports
- Warehouse reports
- Excel export

## Important Notes

### Czech Localization
- Language: Czech (cs)
- Timezone: Europe/Prague
- Currency: CZK
- IČO validation (8-digit Czech business ID)

### Document Numbering
- Stock Receipts: `SR-YYYY-NNN` (e.g., SR-2025-001)
- Stock Write-offs: `SW-YYYY-NNN`
- Projects: `PRJ-YYYY-NNN`
- Invoices: `INV-YYYY-NNN`

### Pagination
- Default page size: 50 items
- Search debounce: 300ms

### File Uploads
- Max size: 20MB
- Allowed: PDF, JPG, PNG, DOCX, XLSX, DWG

## Running Tests

```bash
# Backend tests
docker-compose exec backend pytest

# With coverage
docker-compose exec backend pytest --cov=apps

# Frontend type checking
docker-compose exec frontend npm run type-check
```

## Code Style

### Backend
- Black for formatting
- isort for imports
- Flake8 for linting
- MyPy for type checking

### Frontend
- ESLint with TypeScript
- Prettier for formatting
