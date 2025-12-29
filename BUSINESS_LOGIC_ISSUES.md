# Business Logic Issues: Frontend vs Backend

This document identifies business logic that is currently implemented in the frontend but should be moved to the backend.

## Summary

Found **8 major areas** where business logic should be moved to the backend:

---

## 1. Rent Amount Calculation
**Location:** `frontend/components/FinanceManager.tsx` - `ManualPaymentModal` component

**Lines:** 562-574, 588-589

**Issue:**
- Rent calculation: `(monthlyRent * paymentTermMonths) - discount` is calculated in the frontend
- Period end date calculation: `getPeriodEnd()` function calculates date ranges
- Note formatting with discount information

**Should be:**
- Backend should calculate the total rent amount based on payment term, discounts, and business rules
- Backend should calculate period end dates based on start date and payment term
- Backend should handle discount application logic

---

## 2. Proration Calculation
**Location:** `frontend/services/propertyService.ts`

**Lines:** 362-367

**Issue:**
```typescript
export const calculateProration = (rent: number, terminationDate: string, endDate: string): number => {
    const term = new Date(terminationDate);
    const daysInMonth = new Date(term.getFullYear(), term.getMonth() + 1, 0).getDate();
    const daysUsed = term.getDate();
    return Math.round((daysUsed / daysInMonth) * rent);
};
```

**Used in:** `frontend/components/TenantDetailModal.tsx` (line 51)

**Should be:**
- Proration calculation should be done on the backend when terminating a contract
- Business rules for proration (rounding, partial days, etc.) should be enforced server-side

---

## 3. Electricity Cost Calculation
**Location:** `frontend/components/TenantDetailModal.tsx`

**Lines:** 38-47

**Issue:**
```typescript
const usage = parseFloat(finalReading) - tenant.room.currentMeterReading;
if (usage >= 0) {
    setElecCost(usage * currentRate);
}
```

**Should be:**
- Electricity cost calculation should be done on the backend
- Usage calculation and rate application should be server-side logic

---

## 4. Electricity Rate Retrieval
**Location:** `frontend/services/propertyService.ts`

**Lines:** 305-308

**Issue:**
```typescript
export const getCurrentElectricityRate = (date: string, roomId?: any): number => {
    // In a real app, this should be fetched from the DB state or an async call
    return 5.0; 
};
```

**Used in:** 
- `frontend/components/FinanceManager.tsx` (line 208)
- `frontend/components/TenantDetailModal.tsx` (line 36)

**Should be:**
- Should be an async API call to the backend
- Backend should determine the correct rate based on date, room, and rate rules
- Currently hardcoded to 5.0, which means rate logic is missing

---

## 5. Payment Status Mapping
**Location:** `frontend/services/propertyService.ts` - `getTransactionsByRoom`

**Lines:** 88-96

**Issue:**
```typescript
type: p.category === '房租' ? 'Rent' : 
      p.category === '電費' ? 'Electricity' : 
      p.category === '罰款' ? 'Fee' : 
      p.category === '押金' ? 'Deposit' : 'Rent',
status: p.payment_status_en === 'Paid' ? 'Paid' :
        p.payment_status_en === 'Unpaid' ? 'Unpaid' :
        p.payment_status_en === 'Partial' ? 'Unpaid' : 'Unpaid',
```

**Should be:**
- Category and status mapping should be standardized on the backend
- Backend should return consistent enum values
- Frontend should not need to map Chinese category names to English types

---

## 6. Data Filtering and Aggregation for Charts
**Location:** Multiple components

**Issues:**
- `frontend/components/FinanceManager.tsx` - `PaymentHistoryModal` (lines 746-750): Filters and maps transactions for chart display
- `frontend/components/FinanceManager.tsx` - `ElectricityHistoryModal` (lines 830-834): Calculates usage (readingEnd - readingStart) for chart
- `frontend/components/RoomManager.tsx` (lines 116-122, 125-133): Filters and transforms data for chart visualization

**Should be:**
- Backend should provide pre-aggregated data for charts
- Usage calculations should be done server-side
- Filtering by transaction type should be a backend query parameter

---

## 7. Room Status Filtering
**Location:** `frontend/components/FinanceManager.tsx` - `ElectricityTab`

**Line:** 188

**Issue:**
```typescript
const occupiedRooms = rooms.filter(r => r.status === 'Occupied');
```

**Should be:**
- Backend should provide an endpoint to get only occupied rooms
- Filtering should be a query parameter: `/rooms/?status=Occupied`

---

## 8. Building/Room Name Lookup
**Location:** Multiple components

**Issues:**
- `frontend/components/FinanceManager.tsx` (line 124, 227): Finds building/room by ID in frontend
- `frontend/components/RoomManager.tsx` (line 105): Finds building by ID in frontend

**Should be:**
- Backend should return related entity data (building names, room numbers) in the response
- Or provide denormalized views that include related data
- Frontend should not need to join data client-side

---

## Recommendations

### High Priority (Core Business Logic)
1. **Rent calculation logic** - Critical for financial accuracy
2. **Proration calculation** - Important for contract termination
3. **Electricity cost calculation** - Financial calculation that must be accurate
4. **Electricity rate retrieval** - Currently hardcoded, needs proper implementation

### Medium Priority (Data Consistency)
5. **Payment status/category mapping** - Should be standardized
6. **Data filtering for charts** - Performance and consistency

### Low Priority (Optimization)
7. **Room status filtering** - Can be optimized with backend query
8. **Building/room name lookup** - Can be optimized with better API responses

---

## Implementation Notes

When moving this logic to the backend:

1. **Validation**: Ensure all calculations match business rules exactly
2. **Testing**: Add comprehensive tests for financial calculations
3. **API Design**: Design RESTful endpoints that clearly expose business operations
4. **Error Handling**: Ensure proper error messages for invalid inputs
5. **Performance**: Consider caching for frequently accessed rates and calculations
6. **Audit Trail**: Log all financial calculations for audit purposes

# TO DO LIST:
- Add logic for room change
- Add logic for rent and electricity rate change
- Add field to label new contract, renew
- Add refresh after entering info, so that tenant and room dashboard, reflect changes.
