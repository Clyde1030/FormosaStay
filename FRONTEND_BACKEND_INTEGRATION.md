# Frontend-Backend Integration Guide

This comprehensive guide covers the integration between the FormosaStay frontend and backend, including API endpoints, database views, architecture, and troubleshooting.

## ✅ Completed

### Backend Changes
1. **Added CORS middleware** - Allows frontend (localhost:3000) to connect to backend
2. **Created new routers**:
   - `/buildings/` - List and get buildings
   - `/tenants/` - List, get, create, and update tenants
   - `/rooms/` - Comprehensive room management with dashboard, tenant, payment, and electricity endpoints
   - `/leases/` - Lease management (create, renew, terminate, list, get)
   - `/dashboard/stats` - Dashboard statistics
3. **Database Views** - Implemented PostgreSQL views for optimized data access (see Database Views section below)

### Frontend Changes
1. **Created API client** (`services/apiClient.ts`) - Handles all HTTP requests to FastAPI backend
2. **Updated propertyService** - Replaced Supabase calls with FastAPI API calls
3. **Created `.env.local`** - Configuration for API URL (defaults to http://localhost:8000)

## 🚀 How to Run

### 1. Start Backend
```bash
cd backend
# Make sure you have .env file with database credentials
python run.py
# Or: uvicorn app.main:app --reload
```

Backend will run on: **http://localhost:8000**

### 2. Start Frontend
```bash
cd frontend
npm install  # If not done already
npm run dev
```

Frontend will run on: **http://localhost:3000**

## 📋 Current Status

### ✅ Working Endpoints

#### Buildings
- `GET /buildings/` - List all buildings
- `GET /buildings/{id}` - Get building by ID

#### Rooms
- `GET /rooms/` - List rooms (with optional `building_id` query parameter)
- `GET /rooms/{id}` - Get room by ID
- `GET /rooms/{id}/dashboard` - Get complete dashboard summary for a room (uses `v_room_dashboard_summary` view)
- `GET /rooms/{id}/tenant` - Get current primary tenant for a room (uses `v_room_current_tenant` view)
- `GET /rooms/{id}/tenants` - Get all current tenants for a room (primary and co-tenants)
- `GET /rooms/{id}/payments` - Get payment/invoice history for a room (uses `v_room_payment_history` view)
  - Query params: `category`, `status_filter`, `limit`, `offset`
- `GET /rooms/{id}/electricity` - Get electricity usage and cost history (uses `v_room_electricity_history` view)
  - Query params: `start_date`, `end_date`, `limit`, `offset`

#### Tenants
- `GET /tenants/` - List all tenants (uses `v_tenant_complete` view)
  - Query params: `skip`, `limit`
- `GET /tenants/{id}` - Get tenant by ID with active lease (uses `v_tenant_complete` view)
- `POST /tenants/` - Create new tenant
- `PUT /tenants/{id}` - Update existing tenant

#### Leases
- `GET /leases/` - List leases (with filters)
- `GET /leases/{id}` - Get lease by ID
- `POST /leases/` - Create lease (with tenant creation/update)
- `POST /leases/{id}/renew` - Renew lease
- `POST /leases/{id}/terminate` - Terminate lease (with electricity bill calculation)

#### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics (total rooms, occupied, occupancy rate, overdue totals)

#### Health
- `GET /health` - Health check endpoint
- `GET /health/db` - Database connection health check

### ⚠️ TODO - Missing Backend Endpoints
These frontend functions need backend endpoints:
- `getTransactions()` - Need `/payments/` or `/invoices/` endpoint (global list)
- `addTransaction()` - Need `POST /invoices/` or `POST /payments/` endpoint
- `updateTransaction()` - Need `PUT /invoices/{id}` or `PUT /payments/{id}` endpoint
- `deleteTransaction()` - Need `DELETE /invoices/{id}` or `DELETE /payments/{id}` endpoint
- `getExpenses()` - Need `GET /cash-flow/` endpoint
- `addExpense()` - Need `POST /cash-flow/` endpoint
- `updateExpense()` - Need `PUT /cash-flow/{id}` endpoint
- `deleteExpense()` - Need `DELETE /cash-flow/{id}` endpoint
- `getElectricityRates()` - Need `GET /electricity-rates/` endpoint
- `addElectricityRate()` - Need `POST /electricity-rates/` endpoint
- `deleteElectricityRate()` - Need `DELETE /electricity-rates/{id}` endpoint
- `recordMeterReading()` - Need `POST /meter-readings/` endpoint
- `updateContract()` - Need `PUT /leases/{id}` endpoint

**Note**: `getTransactionsByRoom()` is already implemented via `GET /rooms/{id}/payments`

---

## 🗄️ Database Views

The system uses PostgreSQL views to provide pre-computed, aggregated data that simplifies complex queries and improves performance. These views encapsulate business logic and join multiple tables to provide ready-to-use data for the frontend.

### Views Overview

The following views are defined in the database:

1. **v_room_availability** - Room availability status
2. **v_lease_status** - Lease status calculations
3. **v_tenant_complete** - Complete tenant information with active leases
4. **v_room_current_tenant** - Current tenant(s) for a room
5. **v_room_payment_history** - Payment/invoice history for rooms
6. **v_room_electricity_history** - Electricity usage and billing history
7. **v_room_dashboard_summary** - Comprehensive room dashboard data

### View Details

#### 1. v_room_availability

**Purpose**: Determines if a room is currently available for rent.

**Logic**:
- A room is available if:
  - `is_rentable = TRUE`
  - AND there is NO active lease (no lease with `early_termination_date IS NULL` and `end_date >= CURRENT_DATE`)

**Columns**:
- All columns from `room` table
- `is_available` (BOOLEAN) - Computed availability status

**Backend Usage**: Currently not directly used in API endpoints, but the logic is implemented in `rooms.py` router.

**Frontend Connection**: 
- Indirectly used through `/rooms/` endpoint
- Frontend receives room status as "Occupied" or "Vacant" based on active lease presence

---

#### 2. v_lease_status

**Purpose**: Calculates the current status of a lease based on business rules.

**Business Rules**:
- IF `early_termination_date IS NOT NULL` → **終止** (Terminated)
- ELSE IF `end_date < CURRENT_DATE` → **到期** (Expired)
- ELSE → **有效** (Active)

**Columns**:
- `lease_id` - Lease identifier
- `status` - Computed status (終止/到期/有效)

**Backend Usage**: 
- Logic is embedded in other views (`v_tenant_complete`, `v_room_current_tenant`)
- Used indirectly through tenant and room endpoints

**Frontend Connection**:
- Used in tenant list and room detail views
- Displayed in lease status fields throughout the UI

---

#### 3. v_tenant_complete

**Purpose**: Provides comprehensive tenant information including emergency contacts, active lease details, and associated room/building information.

**Key Features**:
- Aggregates emergency contacts as JSON array
- Includes current active lease (if exists)
- Provides lease assets breakdown (keys, fobs, remotes)
- Calculates lease status using business rules
- Includes room and building information

**Columns**:
- Tenant basic info: `tenant_id`, `first_name`, `last_name`, `tenant_name`, `gender`, `birthday`, `personal_id`, `phone`, `email`, `line_id`, `tenant_address`
- Emergency contacts: `emergency_contacts` (JSONB array)
- Lease info: `lease_id`, `lease_start_date`, `lease_end_date`, `early_termination_date`, `monthly_rent`, `deposit`, `payment_term`, `lease_status`, `vehicle_plate`, `lease_assets`
- Asset quantities: `asset_keys_quantity`, `asset_fob_quantity`, `asset_remote_quantity`
- Room info: `room_id`, `floor_no`, `room_no`, `room_number`, `size_ping`
- Building info: `building_id`, `building_no`, `building_address`

**Backend Usage**:
- **Endpoint**: `GET /tenants/` and `GET /tenants/{tenant_id}`
- **File**: `backend/app/routers/tenants.py`
- Queries the view directly using raw SQL: `SELECT * FROM v_tenant_complete WHERE tenant_id = :tenant_id`

**Frontend Connection**:
- **Service**: `frontend/services/propertyService.ts`
- **Functions**: 
  - `getTenants()` → calls `/tenants/`
  - `fetchTenantsWithDetails()` → calls `/tenants/`
  - `getTenantById()` → calls `/tenants/{tenant_id}`
- **Components**: 
  - `TenantList.tsx` - Displays tenant list
  - Tenant detail modals - Shows complete tenant information

**Data Flow**:
```
Frontend Component
  ↓
propertyService.getTenants()
  ↓
apiClient.get('/tenants/')
  ↓
Backend: GET /tenants/ (tenants.py)
  ↓
SQL: SELECT * FROM v_tenant_complete
  ↓
Response with formatted tenant data
  ↓
Frontend displays tenant list
```

---

#### 4. v_room_current_tenant

**Purpose**: Shows the current active tenant(s) for a room, including both primary and co-tenants.

**Key Features**:
- Returns all tenants for a room (primary and co-tenants)
- Includes tenant role (主要/次要)
- Provides complete lease and tenant information
- Only shows active leases (no early termination, end_date >= CURRENT_DATE)

**Columns**:
- Room info: `room_id`, `building_id`, `floor_no`, `room_no`, `room_number`, `building_no`, `building_address`
- Tenant info: `tenant_id`, `first_name`, `last_name`, `tenant_name`, `gender`, `personal_id`, `phone`, `email`, `line_id`, `tenant_address`
- Lease info: `lease_id`, `lease_start_date`, `lease_end_date`, `early_termination_date`, `monthly_rent`, `deposit`, `payment_term`, `lease_status`, `vehicle_plate`, `assets`
- Relationship: `tenant_role`, `joined_at`

**Backend Usage**:
- **Endpoints**: 
  - `GET /rooms/{room_id}/tenant` - Primary tenant only
  - `GET /rooms/{room_id}/tenants` - All tenants
- **File**: `backend/app/routers/rooms.py`
- Queries with filters: `SELECT * FROM v_room_current_tenant WHERE room_id = :room_id AND tenant_role = '主要'`

**Frontend Connection**:
- **Service**: `frontend/services/propertyService.ts`
- **Functions**:
  - `getTenantInRoom(roomId)` → calls `/rooms/{room_id}/tenant`
  - `getRoomTenants(roomId)` → calls `/rooms/{room_id}/tenants`
- **Components**:
  - `RoomManager.tsx` - Room detail dashboard
  - Room detail modals - Shows current tenant information

**Data Flow**:
```
Frontend: RoomManager component
  ↓
propertyService.getTenantInRoom(roomId)
  ↓
apiClient.get(`/rooms/${roomId}/tenant`)
  ↓
Backend: GET /rooms/{room_id}/tenant (rooms.py)
  ↓
SQL: SELECT * FROM v_room_current_tenant WHERE room_id = :room_id AND tenant_role = '主要'
  ↓
Response with tenant data
  ↓
Frontend displays tenant in room detail view
```

---

#### 5. v_room_payment_history

**Purpose**: Provides complete payment/invoice history for a room, including rent, electricity, penalties, and deposits.

**Key Features**:
- Shows all invoices for a room
- Includes payment status (已交/未交/部分未交/呆帳)
- Provides period information and outstanding amounts
- Links to tenant and lease information

**Columns**:
- Room info: `room_id`, `room_number`
- Invoice info: `invoice_id`, `category`, `period_start`, `period_end`, `due_date`, `due_amount`, `paid_amount`, `payment_status`, `payment_status_en`
- Lease info: `lease_id`, `lease_start_date`, `lease_end_date`
- Tenant info: `tenant_id`, `tenant_name`
- Calculated: `outstanding_amount`, `period_display`

**Backend Usage**:
- **Endpoint**: `GET /rooms/{room_id}/payments`
- **File**: `backend/app/routers/rooms.py`
- Supports filtering by `category` and `status_filter`
- Supports pagination with `limit` and `offset`

**Frontend Connection**:
- **Service**: `frontend/services/propertyService.ts`
- **Function**: `getTransactionsByRoom(roomId)` → calls `/rooms/{room_id}/payments`
- **Components**:
  - `RoomManager.tsx` - Room detail dashboard showing payment history
  - Transaction lists and charts

**Data Flow**:
```
Frontend: RoomManager component
  ↓
propertyService.getTransactionsByRoom(roomId)
  ↓
apiClient.get(`/rooms/${roomId}/payments`)
  ↓
Backend: GET /rooms/{room_id}/payments (rooms.py)
  ↓
SQL: SELECT * FROM v_room_payment_history WHERE room_id = :room_id
  ↓
Response with payment history
  ↓
Frontend displays transactions in room detail view
```

---

#### 6. v_room_electricity_history

**Purpose**: Shows electricity meter readings and calculated costs for a room.

**Key Features**:
- Meter reading history with usage calculations
- Links to electricity invoices
- Includes rate information
- Calculates usage (kWh) between readings
- Shows calculated costs based on rates

**Columns**:
- Room info: `room_id`, `room_number`
- Meter reading: `meter_reading_id`, `read_date`, `current_reading`, `previous_reading`, `usage_kwh`
- Invoice info: `invoice_id`, `period_start`, `period_end`, `due_date`, `electricity_cost`, `paid_amount`, `payment_status`
- Rate info: `rate_per_kwh`, `rate_start_date`, `rate_end_date`
- Calculated: `calculated_cost`
- Lease/Tenant info: `lease_id`, `tenant_id`, `tenant_name`

**Backend Usage**:
- **Endpoint**: `GET /rooms/{room_id}/electricity`
- **File**: `backend/app/routers/rooms.py`
- Supports date filtering with `start_date` and `end_date`
- Supports pagination

**Frontend Connection**:
- **Service**: `frontend/services/propertyService.ts`
- **Function**: `getRoomElectricityHistory(roomId)` → calls `/rooms/{room_id}/electricity`
- **Components**:
  - `RoomManager.tsx` - Room detail dashboard showing electricity history
  - Electricity usage charts and tables

**Data Flow**:
```
Frontend: RoomManager component
  ↓
propertyService.getRoomElectricityHistory(roomId)
  ↓
apiClient.get(`/rooms/${roomId}/electricity`)
  ↓
Backend: GET /rooms/{room_id}/electricity (rooms.py)
  ↓
SQL: SELECT * FROM v_room_electricity_history WHERE room_id = :room_id
  ↓
Response with electricity history
  ↓
Frontend displays electricity data in room detail view
```

---

#### 7. v_room_dashboard_summary

**Purpose**: Comprehensive all-in-one view for room dashboard data, combining tenant, lease, payment, and electricity information.

**Key Features**:
- Single query for all room dashboard data
- Occupancy status
- Current tenant and lease information
- Payment statistics (total invoices, unpaid count, outstanding amount)
- Electricity statistics (latest reading, total cost, bill count)

**Columns**:
- Room/Building: `room_id`, `building_id`, `room_number`, `floor_no`, `room_no`, `size_ping`, `is_rentable`, `building_no`, `building_address`
- Occupancy: `is_occupied` (BOOLEAN)
- Tenant: `tenant_id`, `tenant_name`, `tenant_phone`, `tenant_email`, `tenant_line_id`
- Lease: `lease_id`, `lease_start_date`, `lease_end_date`, `monthly_rent`, `deposit`, `pay_rent_on`, `payment_term`, `vehicle_plate`, `assets`
- Payment stats: `total_invoices`, `unpaid_invoices`, `total_outstanding`
- Electricity stats: `latest_meter_reading`, `latest_meter_reading_date`, `total_electricity_cost`, `electricity_bill_count`

**Backend Usage**:
- **Endpoint**: `GET /rooms/{room_id}/dashboard`
- **File**: `backend/app/routers/rooms.py`
- Provides complete dashboard data in a single query

**Frontend Connection**:
- Currently not directly used in frontend
- Frontend uses separate endpoints for different data types
- Could be used to optimize room dashboard loading

**Potential Optimization**:
The frontend could use this view to reduce multiple API calls:
```typescript
// Instead of multiple calls:
const [tenant, payments, electricity] = await Promise.all([
  getTenantInRoom(roomId),
  getTransactionsByRoom(roomId),
  getRoomElectricityHistory(roomId)
]);

// Could use single call:
const dashboard = await apiClient.get(`/rooms/${roomId}/dashboard`);
```

---

### View Creation and Migration

Views are created through Alembic migrations:
- Location: `backend/alembic/sql/`
- Migration file: `backend/alembic/versions/0002_remove_lease_status_column.py`
- SQL files:
  - `0002_v_room_availability.sql`
  - `0002_v_lease_status.sql`
  - `0002_v_tenant_complete.sql`
  - `0002_v_room_current_tenant.sql`
  - `0002_v_room_payment_history.sql`
  - `0002_v_room_electricity_history.sql`
  - `0002_v_room_dashboard_summary.sql`

To recreate views after database reset:
```bash
# Run Alembic migrations
cd backend
alembic upgrade head
```

### Benefits of Using Views

1. **Performance**: Pre-computed joins and aggregations reduce query complexity
2. **Consistency**: Business logic (like lease status calculation) is centralized
3. **Maintainability**: Changes to business rules only need to be updated in views
4. **Security**: Views can provide controlled access to data
5. **Simplicity**: Frontend gets ready-to-use data without complex transformations

---

## 🏗️ Frontend-Backend Integration Architecture

### API Client Layer

The frontend uses a centralized API client (`frontend/services/apiClient.ts`) that:
- Handles HTTP requests to the FastAPI backend
- Manages base URL configuration (from `VITE_API_URL` env variable)
- Provides error handling and response parsing
- Defaults to `http://localhost:8000`

### Service Layer

The `propertyService.ts` file provides typed functions that:
- Call the API client
- Transform backend responses to frontend data structures
- Handle data mapping (e.g., `building_id` → `buildingId`)
- Provide consistent interfaces for React components

### Component Layer

React components consume the service layer:
- `Dashboard.tsx` - Uses dashboard stats endpoint
- `TenantList.tsx` - Uses tenant endpoints
- `RoomManager.tsx` - Uses room endpoints (tenant, payments, electricity)
- `FinanceManager.tsx` - Uses payment/transaction endpoints

### Data Flow Pattern

```
React Component
  ↓
propertyService function
  ↓
apiClient.get/post/put/delete
  ↓
FastAPI Backend Router
  ↓
SQL View Query (via SQLAlchemy text())
  ↓
PostgreSQL View
  ↓
Response (JSON)
  ↓
Frontend Service (data transformation)
  ↓
React Component (display)
```

### API Design Principles

- RESTful endpoints following FastAPI conventions
- Query parameters for filtering and pagination
- Consistent error handling with HTTP status codes
- JSON responses with standardized data structures
- Database views for optimized data access

---

## 🔧 Configuration

### Backend
Create `backend/.env`:
```env
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=formosastay
```

**Important**: Make sure to run Alembic migrations to create database views:
```bash
cd backend
alembic upgrade head
```

### Frontend
The `.env.local` file is already created with:
```env
VITE_API_URL=http://localhost:8000
```

---

## 🐛 Troubleshooting

### General Issues

1. **CORS errors**: Make sure backend CORS middleware includes your frontend URL
2. **Empty page**: Check browser console for API errors
3. **Connection refused**: Make sure backend is running on port 8000
4. **404 errors**: Check that backend endpoints match frontend API calls

### View-Related Issues

#### View Not Found Errors

If you see errors like "relation does not exist":
1. Ensure Alembic migrations have been run: `alembic upgrade head`
2. Check that SQL view files exist in `backend/alembic/sql/`
3. Verify database connection and permissions

#### Data Not Updating

Views are computed on-the-fly, so data should always be current. If you see stale data:
1. Check that underlying tables have been updated
2. Verify view logic matches business requirements
3. Check for transaction isolation issues

#### Performance Issues

If view queries are slow:
1. Check for missing indexes on underlying tables
2. Consider adding indexes on view filter columns
3. Use `EXPLAIN ANALYZE` to identify bottlenecks
4. Consider materialized views for expensive computations

---

## 📝 Next Steps

1. Add missing backend endpoints (see TODO list above)
2. Test all frontend features
3. Add error handling and loading states
4. Add authentication if needed
5. Optimize room dashboard to use `v_room_dashboard_summary` view for single-query data fetching

## 📚 Related Documentation

- **[README.md](./README.md)** - Project overview and architecture

## 🔮 Future Enhancements

1. **Optimize Room Dashboard**: Use `v_room_dashboard_summary` to reduce API calls
2. **Add Indexes**: Consider adding indexes on view filter columns for better performance
3. **Materialized Views**: For frequently accessed, slow-to-compute views, consider materialized views with refresh strategies
4. **View Caching**: Implement caching layer for expensive view queries
5. **Real-time Updates**: Consider using database triggers or change streams for real-time view updates
