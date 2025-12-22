# Frontend-Backend Integration Guide

## ✅ Completed

### Backend Changes
1. **Added CORS middleware** - Allows frontend (localhost:3000) to connect to backend
2. **Created new routers**:
   - `/buildings/` - List and get buildings
   - `/tenants/` - List, get, and create tenants
   - `/dashboard/stats` - Dashboard statistics
   - Updated `/rooms/` - Now fetches real data from database

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
- `GET /buildings/` - List buildings
- `GET /buildings/{id}` - Get building
- `GET /rooms/` - List rooms (with optional building_id filter)
- `GET /rooms/{id}` - Get room
- `GET /tenants/` - List tenants
- `GET /tenants/{id}` - Get tenant with active lease
- `POST /tenants/` - Create tenant
- `GET /leases/` - List leases (with filters)
- `GET /leases/{id}` - Get lease
- `POST /leases/` - Create lease (with tenant creation/update)
- `POST /leases/{id}/renew` - Renew lease
- `POST /leases/{id}/terminate` - Terminate lease (with electricity bill calculation)
- `GET /dashboard/stats` - Dashboard statistics

### ⚠️ TODO - Missing Backend Endpoints
These frontend functions need backend endpoints:
- `getTransactions()` - Need `/payments/` endpoint
- `getTransactionsByRoom()` - Need `/payments/?room_id=` endpoint
- `addTransaction()` - Need `POST /payments/` endpoint
- `updateTransaction()` - Need `PUT /payments/{id}` endpoint
- `deleteTransaction()` - Need `DELETE /payments/{id}` endpoint
- `getExpenses()` - Need `/cash-flow/` endpoint
- `addExpense()` - Need `POST /cash-flow/` endpoint
- `updateExpense()` - Need `PUT /cash-flow/{id}` endpoint
- `deleteExpense()` - Need `DELETE /cash-flow/{id}` endpoint
- `getElectricityRates()` - Need `/electricity-rates/` endpoint
- `addElectricityRate()` - Need `POST /electricity-rates/` endpoint
- `deleteElectricityRate()` - Need `DELETE /electricity-rates/{id}` endpoint
- `recordMeterReading()` - Need `POST /meter-readings/` endpoint
- `updateTenant()` - Need `PUT /tenants/{id}` endpoint
- `updateContract()` - Need `PUT /leases/{id}` endpoint

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

### Frontend
The `.env.local` file is already created with:
```env
VITE_API_URL=http://localhost:8000
```

## 🐛 Troubleshooting

1. **CORS errors**: Make sure backend CORS middleware includes your frontend URL
2. **Empty page**: Check browser console for API errors
3. **Connection refused**: Make sure backend is running on port 8000
4. **404 errors**: Check that backend endpoints match frontend API calls

## 📝 Next Steps

1. Add missing backend endpoints (see TODO list above)
2. Test all frontend features
3. Add error handling and loading states
4. Add authentication if needed

