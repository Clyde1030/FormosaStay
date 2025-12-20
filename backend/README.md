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

```bash
# Using the run script
python run.py

# Or directly with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

## API Endpoints

### Health Checks
- `GET /health` - Basic health check
- `GET /health/db` - Database health check

### Leases (Contracts)
- `POST /leases/` - Create a new lease contract
- `GET /leases/{lease_id}` - Get a lease by ID
- `GET /leases/` - List leases (with optional filters)
- `POST /leases/{lease_id}/renew` - Renew an existing lease
- `POST /leases/{lease_id}/terminate` - Terminate a lease

### Rooms
- `GET /rooms` - List rooms (placeholder)

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
│   │   └── lease.py
│   ├── schemas/             # Pydantic schemas
│   │   └── lease.py
│   ├── services/            # Business logic layer
│   │   └── lease_service.py
│   └── routers/             # API route handlers
│       ├── health.py
│       ├── rooms.py
│       └── leases.py
├── run.py                   # Server run script
├── pyproject.toml          # Project dependencies
└── README.md
```

## Contract Management

### Creating a New Lease

```json
POST /leases/
{
  "tenant_id": 1,
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
  "reason": "Tenant requested early termination"
}
```

## Development

### Running Tests

```bash
# Install dev dependencies
uv sync --group dev

# Run tests
pytest
```

### Code Style

The project follows PEP 8 style guidelines. Consider using:
- `black` for code formatting
- `ruff` or `flake8` for linting
- `mypy` for type checking

## License

[Add your license here]

