# FormosaStay Backend API

RESTful API backend for FormosaStay rental management system.

## Features

- **Contract Management**: Create, renew, and terminate lease contracts
- **Database Models**: SQLAlchemy models for buildings, rooms, tenants, and leases
- **RESTful API**: FastAPI-based endpoints with automatic documentation
- **Async Support**: Fully async/await database operations

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL database
- [uv](https://github.com/astral-sh/uv) package manager (recommended) or pip

### Installation

1. **Install dependencies**:
   ```bash
   # Using uv (recommended)
   uv sync
   
   # Or using pip
   pip install -e .
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up database**:
   - Create a PostgreSQL database
   - Run the schema creation script:
     ```bash
     psql -U your_user -d formosastay -f ../database_creation/FormosaStaySchema.sql
     ```
   - Optionally run initial data inserts:
     ```bash
     psql -U your_user -d formosastay -f ../database_creation/Initial_Insert.sql
     ```

### Running the Server

**Easiest way** (recommended):
```bash
./run.sh
```

**Alternative methods**:

```bash
# Using uv directly
uv run python run.py
# OR
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# If you used pip/venv, activate your virtual environment first, then:
python run.py
# Or: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The `run.py` script will automatically detect if you're using `uv` and run accordingly.

The API will be available at:
- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## API Endpoints

### Health Checks
- `GET /health` - Basic health check
- `GET /health/db` - Database health check

### Buildings
- `GET /buildings/` - List all buildings
- `GET /buildings/{id}` - Get building by ID

### Rooms
- `GET /rooms/` - List rooms (with optional `building_id` filter)
- `GET /rooms/{id}` - Get room by ID

### Tenants
- `GET /tenants/` - List tenants
- `GET /tenants/{id}` - Get tenant by ID
- `POST /tenants/` - Create new tenant

### Leases (Contracts)
- `POST /leases/` - Create a new lease contract
- `GET /leases/{lease_id}` - Get a lease by ID
- `GET /leases/` - List leases (with optional filters)
- `POST /leases/{lease_id}/renew` - Renew an existing lease
- `POST /leases/{lease_id}/terminate` - Terminate a lease

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration settings
│   ├── db/
│   │   └── session.py       # Database session management
│   ├── models/              # SQLAlchemy models
│   │   ├── base.py
│   │   ├── building.py
│   │   ├── room.py
│   │   ├── tenant.py
│   │   ├── lease.py
│   │   ├── electricity.py
│   │   └── payment.py
│   ├── schemas/             # Pydantic schemas
│   │   ├── lease.py
│   │   ├── tenant.py
│   │   └── electricity.py
│   ├── services/            # Business logic layer
│   │   ├── lease_service.py
│   │   └── electricity_service.py
│   └── routers/             # API route handlers
│       ├── health.py
│       ├── buildings.py
│       ├── rooms.py
│       ├── tenants.py
│       ├── leases.py
│       └── dashboard.py
├── run.py                   # Server run script
├── pyproject.toml          # Project dependencies
└── README.md
```

## Contract Management

### Creating a New Lease

```json
POST /leases/
{
  "tenant_data": {
    "first_name": "John",
    "last_name": "Doe",
    "gender": "M",
    "birthday": "1990-01-01",
    "personal_id": "A123456789",
    "phone": "0912345678",
    "email": "john@example.com",
    "address": "123 Main St",
    "emergency_contacts": [
      {"first_name": "Jane", "last_name": "Doe", "relationship": "Spouse", "phone": "0987654321"}
    ]
  },
  "room_id": 1,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "monthly_rent": 15000.00,
  "deposit": 30000.00,
  "pay_rent_on": 1,
  "payment_term": "monthly",
  "assets": [
    {"asset_type": "key", "quantity": 2},
    {"asset_type": "fob", "quantity": 1}
  ]
}
```

### Renewing a Lease

```json
POST /leases/{lease_id}/renew
{
  "new_end_date": "2025-12-31",
  "new_monthly_rent": 16000.00,
  "new_pay_rent_on": 5
}
```

### Terminating a Lease

```json
POST /leases/{lease_id}/terminate
{
  "termination_date": "2024-06-30",
  "reason": "Tenant requested early termination",
  "meter_reading_date": "2024-06-30",
  "meter_reading": 1250.50
}
```

## Development

### Running Tests

```bash
# Install dev dependencies
uv sync --group dev

# Run tests
uv run pytest
```

### Code Style

The project follows PEP 8 style guidelines. Consider using:
- `black` for code formatting
- `ruff` or `flake8` for linting
- `mypy` for type checking

## Troubleshooting

### ModuleNotFoundError: No module named 'uvicorn'

If you installed dependencies with `uv`, you must use `uv run`:

```bash
# Wrong (uses system Python)
python run.py

# Correct (uses uv environment)
uv run python run.py
```

### Database Connection Issues

- Check your `.env` file has correct database credentials
- Ensure PostgreSQL is running
- Verify database exists and schema is created

## License

[Add your license here]
