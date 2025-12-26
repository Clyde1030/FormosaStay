# Room Dashboard SQL Views

This document describes the SQL views created for the Room Dashboard feature.

## Overview

The Room Dashboard displays comprehensive information about each room, including:
1. **Current Tenant Information** - Who is currently occupying the room
2. **Payment History** - All rent, electricity, fees, and deposit transactions
3. **Electricity Usage & Cost** - Meter readings and electricity bill history

## Views Created

### 1. `v_room_current_tenant`
**Purpose**: Get current active tenant(s) for a room

**Returns**:
- Room information (room_id, room_number, building details)
- Tenant information (name, contact info, personal_id)
- Lease details (rent, deposit, dates, payment terms, vehicle plate, assets)
- Tenant role (primary/secondary)

**Use Case**: Display tenant card in Room Dashboard

**Example Query**:
```sql
SELECT * FROM v_room_current_tenant WHERE room_id = 17;
```

**Note**: If a room has multiple tenants, this view returns one row per tenant. Filter by `tenant_role = '主要'` to get only the primary tenant.

---

### 2. `v_room_payment_history`
**Purpose**: Get all payment/invoice records for a room

**Returns**:
- Invoice details (category, period, due_date, amounts, status)
- Outstanding amount calculation
- Period display string (formatted for UI)
- Tenant information

**Use Case**: Display payment history chart and list

**Example Query**:
```sql
SELECT * FROM v_room_payment_history 
WHERE room_id = 17 
ORDER BY due_date DESC;
```

**Categories Included**:
- `房租` (Rent)
- `電費` (Electricity)
- `罰款` (Penalty/Fee)
- `押金` (Deposit)

---

### 3. `v_room_electricity_history`
**Purpose**: Get electricity meter readings and costs for a room

**Returns**:
- Meter reading details (date, reading amount)
- Calculated usage (kWh) - difference from previous reading
- Electricity rate information
- Associated invoice/cost information
- Calculated cost (if rate is available)

**Use Case**: Display electricity usage & cost chart

**Example Query**:
```sql
SELECT * FROM v_room_electricity_history 
WHERE room_id = 17 
ORDER BY read_date DESC;
```

**Features**:
- Automatically calculates usage (kWh) by comparing with previous reading
- Links meter readings to electricity invoices
- Shows electricity rates that were in effect at the time

---

### 4. `v_room_dashboard_summary`
**Purpose**: Get complete dashboard summary in one query

**Returns**:
- All room basic information
- Occupancy status (is_occupied boolean)
- Current tenant (primary only)
- Current lease details
- Payment statistics (total invoices, unpaid count, outstanding amount)
- Electricity statistics (latest reading, total cost, bill count)

**Use Case**: Quick overview or room list with summary stats

**Example Query**:
```sql
SELECT * FROM v_room_dashboard_summary WHERE room_id = 17;
```

**Statistics Included**:
- `total_invoices`: Total number of invoices
- `unpaid_invoices`: Count of unpaid invoices
- `total_outstanding`: Total outstanding amount (NT$)
- `latest_meter_reading`: Most recent meter reading value
- `latest_meter_reading_date`: Date of latest reading
- `total_electricity_cost`: Sum of all electricity bills
- `electricity_bill_count`: Number of electricity invoices

---

## Backend API Endpoints to Create

To expose this data to the frontend, create the following endpoints:

### 1. Get Room Dashboard Summary
```
GET /rooms/{room_id}/dashboard
```
Returns: `v_room_dashboard_summary` data for the room

### 2. Get Room Current Tenant
```
GET /rooms/{room_id}/tenant
```
Returns: `v_room_current_tenant` data (filtered to primary tenant)

### 3. Get Room Payment History
```
GET /rooms/{room_id}/payments
```
Returns: `v_room_payment_history` data, optionally filtered by:
- `category` (房租, 電費, 罰款, 押金)
- `status` (未交, 已交, etc.)
- `limit` and `offset` for pagination

### 4. Get Room Electricity History
```
GET /rooms/{room_id}/electricity
```
Returns: `v_room_electricity_history` data, optionally filtered by:
- Date range (`start_date`, `end_date`)
- `limit` and `offset` for pagination

---

## Implementation Steps

1. **Run the SQL file** to create the views:
   ```bash
   psql -U your_user -d your_database -f backend/app/db/views/room_dashboard_views.sql
   ```

2. **Create backend endpoints** in `backend/app/routers/rooms.py`:
   - Add functions to query these views
   - Return data in JSON format matching frontend expectations

3. **Update frontend services** in `frontend/services/propertyService.ts`:
   - Update `getTenantInRoom()` to use `/rooms/{id}/tenant`
   - Update `getTransactionsByRoom()` to use `/rooms/{id}/payments`
   - Add `getRoomElectricityHistory()` to use `/rooms/{id}/electricity`
   - Add `getRoomDashboardSummary()` to use `/rooms/{id}/dashboard`

4. **Update RoomManager component** to use the new data structure

---

## Data Structure Mapping

### Frontend `Transaction` type → `v_room_payment_history`
```typescript
{
  id: invoice_id,
  type: category === '房租' ? 'Rent' : category === '電費' ? 'Electricity' : ...,
  amount: due_amount,
  dueDate: due_date,
  status: payment_status_en, // 'Paid', 'Unpaid', 'Partial'
  periodStart: period_start,
  periodEnd: period_end,
  tenantName: tenant_name
}
```

### Frontend `TenantWithContract` → `v_room_current_tenant`
```typescript
{
  id: tenant_id,
  name: tenant_name,
  phone: phone,
  email: email,
  lineId: line_id,
  currentContract: {
    id: lease_id,
    rentAmount: monthly_rent,
    depositAmount: deposit,
    startDate: lease_start_date,
    endDate: lease_end_date,
    paymentFrequency: payment_term,
    vehicle_plate: vehicle_plate,
    itemsIssued: assets // JSONB array
  }
}
```

### Electricity Data → `v_room_electricity_history`
```typescript
{
  date: read_date,
  usage: usage_kwh,
  cost: electricity_cost || calculated_cost,
  periodStart: period_start,
  periodEnd: period_end,
  readingStart: previous_reading,
  readingEnd: current_reading
}
```

---

## Notes

- All views filter out soft-deleted records (`deleted_at IS NULL`)
- Views use `LEFT JOIN` so they return data even if some relationships are missing
- The electricity view uses window functions (`LAG`) to calculate usage
- Payment history includes all invoice categories, not just rent
- The summary view provides aggregated statistics for quick overview

