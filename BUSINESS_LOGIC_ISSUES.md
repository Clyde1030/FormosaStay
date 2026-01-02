# Business Logic Issues: Frontend vs Backend

This document identifies business logic that is currently implemented in the frontend but should be moved to the backend.

## Summary

Found **12 major areas** where business logic should be moved to the backend:

- **7 REMAINING** ⚠️ (still in frontend)

## ⚠️ REMAINING Issues (Still in Frontend)

### 6. Payment Status/Category Mapping
**Location:** `frontend/services/propertyService.ts` - `getTransactions`

**Lines:** 80-89, 91-93

**Issue:**
```typescript
type: p.category === 'rent' ? 'Rent' : 
      p.category === 'electricity' ? 'Electricity' : 
      p.category === 'penalty' ? 'Fee' : 
      p.category === 'deposit' ? 'Deposit' : 'Rent',
status: p.status === 'paid' ? 'Paid' :
        p.status === 'overdue' ? 'Overdue' :
        p.status === 'partial' ? 'Overdue' : 
        p.status === 'uncollectable' ? 'Overdue' : 'Overdue',
method: p.payment_method === 'bank' ? 'Transfer' :
        p.payment_method === 'cash' ? 'Cash' :
        p.payment_method === 'LINE_Pay' ? 'LinePay' : undefined,
```

**Note:** `getTransactionsByRoom` (line 114-117) correctly uses backend-provided `transaction_type` and `transaction_status`, but `getTransactions` still does client-side mapping.

**Should be:**
- Backend should return standardized enum values for all transaction endpoints
- Frontend should not need to map backend category/status values
- Consistent with `getTransactionsByRoom` which already uses backend mappings

---

### 7. Expense Filtering by Direction
**Location:** `frontend/services/propertyService.ts` - `getExpenses`

**Line:** 287

**Issue:**
```typescript
const expenses = data.filter(cf => cf.category_direction === 'out' || cf.direction === 'out');
```

**Should be:**
- Backend should provide a query parameter: `/cash-flow/?direction=out` or `/cash-flow/expenses`
- Filtering should be done server-side
- Frontend should not need to filter all cash flows client-side

---

### 8. Room Status Filtering
**Location:** `frontend/components/FinanceManager.tsx` - `ElectricityTab`

**Line:** 204

**Issue:**
```typescript
const occupiedRooms = rooms.filter(r => r.status === 'Occupied');
```

**Should be:**
- Backend should provide query parameter: `/rooms/?status=Occupied`
- Filtering should be a backend query parameter
- Reduces data transfer and improves performance

---

### 9. Data Filtering and Aggregation for Charts
**Location:** Multiple components

**Issues:**
- `frontend/components/FinanceManager.tsx` - `PaymentHistoryModal` (line 1011): Filters transactions by type `t.type === 'Rent'`
- `frontend/components/FinanceManager.tsx` - `ElectricityHistoryModal` (line 1084): Filters transactions by type `t.type === 'Electricity'`
- `frontend/components/RoomManager.tsx` (line 116): Filters and maps transactions for chart display
- `frontend/components/FinanceManager.tsx` (line 118): Filters out `MachineIncome` transactions

**Should be:**
- Backend should provide pre-filtered endpoints: `/rooms/{roomId}/invoices?category=rent`
- Backend should provide pre-aggregated chart data endpoints
- Filtering by transaction type should be a backend query parameter
- Reduces client-side processing and ensures consistency

---

### 10. Building/Room Name Formatting and Lookup
**Location:** Multiple components and services

**Issues:**
- `frontend/services/propertyService.ts` (line 16): Formats building name `Building ${b.building_no}`
- `frontend/services/propertyService.ts` (line 28, 59, 154, 234): Formats room number `${r.floor_no}${r.room_no}`
- `frontend/services/propertyService.ts` (line 40, 135, 195): Formats tenant name `${t.last_name}${t.first_name}`
- `frontend/components/RoomManager.tsx` (line 105): Finds building by ID in frontend
- `frontend/components/FinanceManager.tsx` (line 124, 227): Finds building/room by ID in frontend
- `frontend/components/TenantList.tsx` (line 38-45): Formats location string

**Should be:**
- Backend should return formatted display names in API responses
- Backend should include related entity data (building names, room numbers) in responses
- Or provide denormalized views that include related data
- Frontend should not need to join data client-side or format display strings

---

### 11. Floor/Room Filtering Logic
**Location:** `frontend/components/FinanceManager.tsx` - `ExpensesTab`

**Lines:** 377-388

**Issue:**
```typescript
const availableFloors = Array.from(new Set(
    rooms.filter(r => !expenseForm.building_id || r.building_id === Number(expenseForm.building_id))
        .map(r => r.floor_no)
)).sort((a: number, b: number) => a - b);

const availableRooms = rooms.filter(r => {
    if (expenseForm.building_id && r.building_id !== Number(expenseForm.building_id)) return false;
    if (expenseForm.floor_no && r.floor_no !== Number(expenseForm.floor_no)) return false;
    return true;
});
```

**Should be:**
- Backend should provide hierarchical endpoints:
  - `/buildings/{buildingId}/floors` - Get available floors for a building
  - `/buildings/{buildingId}/floors/{floorNo}/rooms` - Get rooms for a floor
- Or use query parameters: `/rooms/?building_id={id}&floor_no={floor}`
- Reduces client-side filtering and improves UX with cascading dropdowns

---

### 12. Category Lookup and Mapping
**Location:** `frontend/services/propertyService.ts`

**Lines:** 362, 513, 562

**Issue:**
```typescript
const laundryCategory = categories.find(c => c.code === 'laundry_income');
const category = categories.find(c => c.chinese_name === ex.category);
```

**Should be:**
- Backend should accept category IDs directly
- Or backend should accept category codes/names and resolve them server-side
- Frontend should not need to fetch all categories and search client-side
- Reduces API calls and client-side logic

---

## Recommendations

### Medium Priority (Data Consistency)
5. **Payment status/category mapping** - Should be standardized (partially fixed in `getTransactionsByRoom`)
6. **Data filtering for charts** - Performance and consistency
7. **Expense filtering** - Should use backend query parameters
8. **Category lookup** - Should use backend resolution

### Low Priority (Optimization)
9. **Room status filtering** - Can be optimized with backend query
10. **Building/room name lookup** - Can be optimized with better API responses
11. **Floor/room filtering** - Can be optimized with hierarchical endpoints
12. **Name/display formatting** - Can be optimized with backend formatting

---

## Implementation Notes

When moving remaining logic to the backend:

1. **API Design**: 
   - Use query parameters for filtering: `?status=Occupied&category=rent`
   - Provide hierarchical endpoints for cascading dropdowns
   - Return formatted display names in API responses

2. **Consistency**: 
   - Ensure all endpoints return standardized enum values
   - Use the same approach as `getTransactionsByRoom` which already uses backend mappings

3. **Performance**: 
   - Pre-filter and pre-aggregate data on the backend
   - Reduce data transfer by filtering server-side
   - Cache frequently accessed lookups (categories, buildings)

4. **Testing**: 
   - Test all filtering and query parameter combinations
   - Verify formatted display names are correct
   - Ensure backward compatibility during migration

---

## Progress Summary

- **Fixed:** 5/12 issues (42%)
- **Remaining:** 7/12 issues (58%)
- **Critical Issues:** All fixed ✅
- **Medium Priority:** 4 remaining
- **Low Priority:** 3 remaining

---

# TO DO LIST:
- Add logic for room change
- Add logic for rent and electricity rate change
- Add field to label new contract, renew
- Add refresh after entering info, so that tenant and room dashboard, reflect changes.
