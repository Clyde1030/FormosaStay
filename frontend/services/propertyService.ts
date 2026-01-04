import { apiClient } from './apiClient';
import { 
    Building, Room, Tenant, Lease, LeaseStatus, 
    TenantWithLease, Invoice, CashFlow, 
    ElectricityRate, MeterReading, Transaction, Expense,
    TenantWithContract, Contract, PaymentFrequency, DepositStatus,
    CashFlowCategory, CashAccount, Gender, GenderFromChinese
} from '../types';

// --- Data Fetching ---

export const getBuildings = async (): Promise<Building[]> => {
    const data = await apiClient.get<any[]>('/buildings/');
    return data.map(b => ({
        ...b,
        name: `Building ${b.building_no}`,
        totalRooms: 0
    }));
};

export const getRooms = async (buildingId?: number): Promise<Room[]> => {
    const endpoint = buildingId ? `/rooms/?building_id=${buildingId}` : '/rooms/';
    const data = await apiClient.get<any[]>(endpoint);
    
    return data.map(r => ({
        ...r,
        buildingId: r.building_id,
        roomNumber: r.roomNumber || `${r.floor_no}${r.room_no}`,
        sizePing: r.size_ping || r.sizePing,
        status: r.status || 'Vacant',
        currentMeterReading: r.currentMeterReading || 0
    }));
};

export const getTenants = async (search?: string): Promise<Tenant[]> => {
    const params = search ? { search } : {};
    const data = await apiClient.get<any[]>('/tenants/', { params });
    return data.map(t => ({
        ...t,
        name: t.name || `${t.last_name}${t.first_name}`,
        phoneNumber: t.phoneNumber || t.phone,
        idNumber: t.idNumber || t.personal_id,
        emergency_contacts: t.emergency_contacts || []
    }));
};

export const fetchTenantsWithDetails = async (search?: string): Promise<TenantWithLease[]> => {
    // Get tenants from the view which already includes active lease info
    // The API response may include active_lease, room, and building even though Tenant type doesn't have them
    const tenants = await getTenants(search);
    
    return tenants.map(t => {
        const tenantData = t as any; // API response includes additional fields
        return {
            ...t,
            active_lease: tenantData.active_lease,
            room: tenantData.room || tenantData.active_lease?.room ? {
                ...(tenantData.room || tenantData.active_lease.room),
                roomNumber: (tenantData.room || tenantData.active_lease?.room)?.roomNumber || 
                           `${(tenantData.room || tenantData.active_lease?.room)?.floor_no}${(tenantData.room || tenantData.active_lease?.room)?.room_no}`
            } : undefined,
            building: tenantData.building || tenantData.active_lease?.room?.building
        };
    });
};

// --- Transaction & Payment Mapping ---
// Note: These endpoints need to be added to the backend
// For now, returning empty arrays as placeholders

export const getTransactions = async (): Promise<Transaction[]> => {
    try {
        const data = await apiClient.get<any[]>('/invoices/');
        
        return data.map(p => ({
            id: p.invoice_id?.toString() || p.id?.toString() || '',
            roomId: p.room_id,
            tenantName: p.tenant_name || '',
            contractId: p.lease_id,
            type: p.category === 'rent' ? 'Rent' : 
                  p.category === 'electricity' ? 'Electricity' : 
                  p.category === 'penalty' ? 'Fee' : 
                  p.category === 'deposit' ? 'Deposit' : 'Rent',
            amount: Number(p.amount) || 0,
            dueDate: p.due_date || '',
            status: p.status === 'paid' ? 'Paid' :
                    p.status === 'overdue' ? 'Overdue' :
                    p.status === 'partial' ? 'Overdue' : 
                    p.status === 'uncollectable' ? 'Overdue' : 'Overdue',
            paidDate: p.paid_date || (p.status === 'paid' ? p.due_date : undefined),
            method: p.payment_method === 'bank' ? 'Transfer' :
                    p.payment_method === 'cash' ? 'Cash' :
                    p.payment_method === 'LINE_Pay' ? 'LinePay' : undefined,
            note: p.note,
            periodStart: p.period_start || '',
            periodEnd: p.period_end || ''
        }));
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
};

export const getTransactionsByRoom = async (roomId: any): Promise<Transaction[]> => {
    try {
        const invoices = await apiClient.get<any[]>(`/rooms/${roomId}/invoices`);
        
        // Backend now provides transaction_type and transaction_status with proper mappings
        return invoices.map(p => ({
            id: p.invoice_id?.toString() || '',
            roomId: roomId,
            tenantName: p.tenant_name || '',
            contractId: p.lease_id,
            type: p.transaction_type || 'Rent', // Backend provides mapped transaction type
            amount: Number(p.due_amount) || 0,
            dueDate: p.due_date || '',
            status: p.transaction_status || 'Overdue', // Backend provides mapped transaction status
            paidDate: p.transaction_status === 'Paid' ? p.due_date : undefined,
            periodStart: p.period_start || '',
            periodEnd: p.period_end || '',
            description: p.period_display || ''
        }));
    } catch (error) {
        console.error('Error fetching transactions by room:', error);
        return [];
    }
};

export const getTenantById = async (tenantId: number): Promise<TenantWithContract | null> => {
    try {
        const tenant = await apiClient.get<any>(`/tenants/${tenantId}`);
        
        return {
            ...tenant,
            name: tenant.name || `${tenant.last_name}${tenant.first_name}`,
            phoneNumber: tenant.phoneNumber || tenant.phone,
            idNumber: tenant.idNumber || tenant.personal_id,
            emergency_contacts: tenant.emergency_contacts || [],
            currentContract: tenant.active_lease ? {
                id: tenant.active_lease.id,
                rentAmount: Number(tenant.active_lease.monthly_rent),
                depositAmount: Number(tenant.active_lease.deposit),
                itemsIssued: tenant.active_lease.assets || [],
                paymentFrequency: tenant.active_lease.payment_term || PaymentFrequency.MONTHLY,
                depositStatus: DepositStatus.PAID,
                startDate: tenant.active_lease.start_date,
                endDate: tenant.active_lease.end_date,
                status: tenant.active_lease.status,
                vehicle_plate: tenant.active_lease.vehicle_plate,
                submitted_at: tenant.active_lease.submitted_at || null
            } : undefined,
            room: tenant.active_lease?.room ? {
                id: tenant.active_lease.room.id,
                roomNumber: tenant.active_lease.room.roomNumber || `${tenant.active_lease.room.floor_no}${tenant.active_lease.room.room_no}`,
                building_id: tenant.active_lease.room.building_id,
                floor_no: tenant.active_lease.room.floor_no,
                room_no: tenant.active_lease.room.room_no
            } : tenant.room ? {
                id: tenant.room.id,
                roomNumber: tenant.room.roomNumber || `${tenant.room.floor_no}${tenant.room.room_no}`,
                building_id: tenant.room.building_id,
                floor_no: tenant.room.floor_no,
                room_no: tenant.room.room_no
            } : undefined,
            building: tenant.building || undefined
        };
    } catch (error) {
        console.error('Error fetching tenant by ID:', error);
        return null;
    }
};

export const getTenantInRoom = async (roomId: any): Promise<TenantWithContract | null> => {
    try {
        // Use the new room tenant endpoint
        const tenantData = await apiClient.get<any>(`/rooms/${roomId}/tenant`);
        
        // Handle null response (room is vacant)
        if (!tenantData || tenantData === null) {
            console.log(`Room ${roomId} is vacant (no tenant data returned)`);
            return null;
        }
        
        // Check if tenant_id exists
        if (!tenantData.tenant_id) {
            console.log(`Room ${roomId} has no tenant_id in response:`, tenantData);
            return null;
        }
        
        // Map the view data to TenantWithContract format
        return {
            id: tenantData.tenant_id,
            first_name: tenantData.first_name,
            last_name: tenantData.last_name,
            name: tenantData.tenant_name || `${tenantData.last_name}${tenantData.first_name}`,
            gender: tenantData.gender,
            birthday: tenantData.birthday || '',
            personal_id: tenantData.personal_id,
            idNumber: tenantData.personal_id,
            phone: tenantData.phone,
            phoneNumber: tenantData.phone,
            email: tenantData.email,
            line_id: tenantData.line_id,
            lineId: tenantData.line_id,
            address: tenantData.tenant_address,
            currentContract: {
                id: tenantData.lease_id,
                tenant_id: tenantData.tenant_id,
                room_id: tenantData.room_id,
                // Lease base properties
                start_date: tenantData.lease_start_date,
                end_date: tenantData.terminated_at || tenantData.lease_end_date,
                monthly_rent: Number(tenantData.monthly_rent) || 0,
                deposit: Number(tenantData.deposit) || 0,
                payment_term: tenantData.payment_term || '',
                pay_rent_on: tenantData.pay_rent_on || 1,
                status: tenantData.lease_status,
                vehicle_plate: tenantData.vehicle_plate,
                // Contract-specific properties
                rentAmount: Number(tenantData.monthly_rent) || 0,
                depositAmount: Number(tenantData.deposit) || 0,
                startDate: tenantData.lease_start_date,
                endDate: tenantData.terminated_at || tenantData.lease_end_date,
                paymentFrequency: tenantData.payment_term as PaymentFrequency,
                depositStatus: DepositStatus.PAID,
                itemsIssued: Array.isArray(tenantData.assets) ? tenantData.assets : [],
                submitted_at: tenantData.submitted_at || null
            },
            room: {
                id: tenantData.room_id,
                building_id: tenantData.building_id,
                floor_no: tenantData.floor_no || 0,
                room_no: tenantData.room_no || '',
                roomNumber: tenantData.room_number || `${tenantData.floor_no}${tenantData.room_no}`,
                size_ping: tenantData.size_ping || 0,
                currentMeterReading: tenantData.currentMeterReading || 0
            },
            building: tenantData.building_id ? {
                id: tenantData.building_id,
                building_no: tenantData.building_no,
                address: tenantData.building_address
            } : undefined
        };
    } catch (error) {
        console.error('Error fetching tenant in room:', error);
        return null;
    }
};

export const getRoomTenants = async (roomId: any): Promise<any[]> => {
    try {
        const data = await apiClient.get<any[]>(`/rooms/${roomId}/tenants`);
        return data.map(item => ({
            ...item,
            assets: Array.isArray(item.assets) ? item.assets : (item.assets ? JSON.parse(item.assets) : [])
        }));
    } catch (error) {
        console.error('Error fetching room tenants:', error);
        return [];
    }
};

export const getRoomElectricityHistory = async (roomId: any): Promise<any[]> => {
    try {
        const data = await apiClient.get<any[]>(`/rooms/${roomId}/electricity`);
        return data.map(item => ({
            date: item.read_date,
            usage: Number(item.usage_kwh) || 0,
            cost: Number(item.electricity_cost || item.calculated_cost) || 0,
            periodStart: item.period_start || '',
            periodEnd: item.period_end || '',
            readingStart: Number(item.previous_reading) || 0,
            readingEnd: Number(item.current_reading) || 0,
            rate: Number(item.rate_per_kwh) || 0
        }));
    } catch (error) {
        console.error('Error fetching electricity history:', error);
        return [];
    }
};

export const getExpenses = async (): Promise<Expense[]> => {
    try {
        // Backend filters expenses by direction=out server-side
        const data = await apiClient.get<any[]>('/cash-flow/?direction=out');
        
        return data.map(cf => ({
            id: cf.id?.toString() || '',
            category: cf.category_name || cf.category_code || '',
            amount: Number(cf.amount) || 0,
            description: cf.note || '',
            attachmentName: '', // Attachment handling would need separate endpoint
            date: cf.flow_date || '',
            cash_account_id: cf.cash_account_id,
            building_id: cf.building_id,
            room_id: cf.room_id,
            payment_method: cf.payment_method
        }));
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return [];
    }
};

export const getCashFlowCategories = async (category_group?: string): Promise<CashFlowCategory[]> => {
    try {
        const url = category_group 
            ? `/cash-flow/categories?category_group=${category_group}`
            : '/cash-flow/categories';
        const data = await apiClient.get<CashFlowCategory[]>(url);
        return data;
    } catch (error) {
        console.error('Error fetching cash flow categories:', error);
        return [];
    }
};

export const getCashAccounts = async (): Promise<CashAccount[]> => {
    try {
        const data = await apiClient.get<any[]>('/cash-flow/accounts');
        return data.map(acc => ({
            id: acc.id,
            chinese_name: acc.name || acc.chinese_name, // Support both for backward compatibility
            account_type: acc.account_type,
            note: acc.note
        }));
    } catch (error) {
        console.error('Error fetching cash accounts:', error);
        return [];
    }
};

export const getElectricityRates = async (): Promise<ElectricityRate[]> => {
    // TODO: Add /electricity-rates/ endpoint to backend
    try {
        return [];
    } catch (error) {
        console.error('Error fetching electricity rates:', error);
        return [];
    }
};

// --- Operations ---

export const addTransaction = async (tx: Partial<Transaction>) => {
    try {
        // Map frontend Transaction type to backend category
        const categoryMap: { [key: string]: string } = {
            'Rent': 'rent',
            'Electricity': 'electricity',
            'Deposit': 'deposit',
            'Fee': 'penalty',
            'MachineIncome': 'rent' // Machine income will be handled separately
        };
        
        // Handle MachineIncome separately (create cash flow only, no invoice)
        if (tx.type === 'MachineIncome') {
            // Get laundry income category
            const categories = await getCashFlowCategories();
            const laundryCategory = categories.find(c => c.code === 'laundry_income');
            
            if (!laundryCategory) {
                throw new Error('Laundry income category not found');
            }
            
            // Get or use default cash account (first one)
            const cashAccounts = await apiClient.get<any[]>('/cash-flow/accounts').catch(() => []);
            const cashAccountId = cashAccounts.length > 0 ? cashAccounts[0].id : 1;
            
            const cashFlowData = {
                category_id: laundryCategory.id,
                cash_account_id: cashAccountId,
                flow_date: tx.dueDate || new Date().toISOString().split('T')[0],
                amount: tx.amount || 0,
                payment_method: 'cash',
                note: tx.description || 'Coin Laundry Collection'
            };
            
            await apiClient.post('/cash-flow/', cashFlowData);
            return;
        }
        
        if (!tx.roomId) {
            throw new Error('Room ID is required for payment transactions');
        }
        
        // Map Transaction type to Invoice category (English)
        const invoiceCategoryMap: { [key: string]: string } = {
            'Rent': 'rent',
            'Electricity': 'electricity',
            'Deposit': 'deposit',
            'Fee': 'penalty'
        };
        
        const paymentData: any = {
            room_id: Number(tx.roomId),
            category: invoiceCategoryMap[tx.type || 'Rent'] || 'rent',
            amount: tx.amount || 0,
            due_date: tx.dueDate || new Date().toISOString().split('T')[0],
            status: tx.status === 'Paid' ? 'paid' : 'overdue',
            period_start: tx.periodStart,
            period_end: tx.periodEnd,
            note: tx.note
        };
        
        if (tx.contractId) {
            paymentData.lease_id = tx.contractId;
        }
        
        if (tx.status === 'Paid' && tx.paidDate) {
            paymentData.paid_date = tx.paidDate;
        }
        
        if (tx.method) {
            const methodMap: { [key: string]: string } = {
                'Transfer': 'bank',
                'Cash': 'cash',
                'LinePay': 'LINE_Pay',
                'Other': 'other'
            };
            paymentData.payment_method = methodMap[tx.method] || 'bank';
        }
        
        await apiClient.post('/invoices/', paymentData);
    } catch (error) {
        console.error('Error adding transaction:', error);
        throw error;
    }
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
        const updateData: any = {};
        
        if (updates.type) {
            const categoryMap: { [key: string]: string } = {
                'Rent': 'rent',
                'Electricity': 'electricity',
                'Deposit': 'deposit',
                'Fee': 'penalty'
            };
            updateData.category = categoryMap[updates.type];
        }
        
        if (updates.amount !== undefined) {
            updateData.amount = updates.amount;
        }
        
        if (updates.dueDate) {
            updateData.due_date = updates.dueDate;
        }
        
        if (updates.periodStart) {
            updateData.period_start = updates.periodStart;
        }
        
        if (updates.periodEnd) {
            updateData.period_end = updates.periodEnd;
        }
        
        if (updates.status) {
            const statusMap: { [key: string]: string } = {
                'Paid': 'paid',
                'Overdue': 'overdue'
            };
            updateData.status = statusMap[updates.status] || updates.status;
        }
        
        if (updates.paidDate) {
            updateData.paid_date = updates.paidDate;
        }
        
        if (updates.method) {
            const methodMap: { [key: string]: string } = {
                'Transfer': 'bank',
                'Cash': 'cash',
                'LinePay': 'LINE_Pay',
                'Other': 'other'
            };
            updateData.payment_method = methodMap[updates.method] || 'bank';
        }
        
        if (updates.note !== undefined) {
            updateData.note = updates.note;
        }
        
        if (updates.readingEnd !== undefined) {
            updateData.description = `Reading Adjusted to ${updates.readingEnd}`;
        }
        
        await apiClient.put(`/invoices/${id}`, updateData);
    } catch (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
};

export const deleteTransaction = async (id: string) => {
    try {
        await apiClient.delete(`/invoices/${id}`);
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
};

export const addExpense = async (ex: Partial<Expense>) => {
    try {
        // Get operation categories to find the category ID
        const categories = await getCashFlowCategories('operation');
        const category = categories.find(c => c.chinese_name === ex.category);
        
        if (!category) {
            throw new Error(`Category "${ex.category}" not found in operation categories`);
        }
        
        // Use provided cash_account_id or get default
        let cashAccountId = ex.cash_account_id;
        if (!cashAccountId) {
            const cashAccounts = await apiClient.get<any[]>('/cash-flow/accounts').catch(() => []);
            cashAccountId = cashAccounts.length > 0 ? cashAccounts[0].id : 1;
        }
        
        const cashFlowData: any = {
            category_id: category.id,
            cash_account_id: cashAccountId,
            flow_date: ex.date || new Date().toISOString().split('T')[0],
            amount: ex.amount || 0,
            payment_method: ex.payment_method || 'cash', // Use provided or default to cash
            note: ex.description || ''
        };
        
        // Add building_id and room_id if provided
        if (ex.building_id) {
            cashFlowData.building_id = ex.building_id;
        }
        if (ex.room_id) {
            cashFlowData.room_id = ex.room_id;
        }
        
        // Handle attachment if provided
        if (ex.attachmentName) {
            // Note: File upload would need separate endpoint, for now just store the name
            cashFlowData.note = (cashFlowData.note ? cashFlowData.note + '\n' : '') + `Attachment: ${ex.attachmentName}`;
        }
        
        await apiClient.post('/cash-flow/', cashFlowData);
    } catch (error) {
        console.error('Error adding expense:', error);
        throw error;
    }
};

export const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
        const updateData: any = {};
        
        if (updates.category) {
            const categories = await getCashFlowCategories('operation');
            const category = categories.find(c => c.chinese_name === updates.category);
            if (category) {
                updateData.category_id = category.id;
            }
        }
        
        if (updates.cash_account_id !== undefined) {
            updateData.cash_account_id = updates.cash_account_id;
        }
        
        if (updates.building_id !== undefined) {
            updateData.building_id = updates.building_id;
        }
        
        if (updates.room_id !== undefined) {
            updateData.room_id = updates.room_id;
        }
        
        if (updates.payment_method !== undefined) {
            updateData.payment_method = updates.payment_method;
        }
        
        if (updates.amount !== undefined) {
            updateData.amount = updates.amount;
        }
        
        if (updates.date) {
            updateData.flow_date = updates.date;
        }
        
        if (updates.description !== undefined) {
            updateData.note = updates.description;
        }
        
        await apiClient.put(`/cash-flow/${id}`, updateData);
    } catch (error) {
        console.error('Error updating expense:', error);
        throw error;
    }
};

export const deleteExpense = async (id: string) => {
    try {
        await apiClient.delete(`/cash-flow/${id}`);
    } catch (error) {
        console.error('Error deleting expense:', error);
        throw error;
    }
};

export const addElectricityRate = async (rate: Partial<ElectricityRate>) => {
    // TODO: Add /electricity-rates/ endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const deleteElectricityRate = async (id: string | number) => {
    // TODO: Add DELETE /electricity-rates/{id} endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export interface ElectricityRateResponse {
    rate_per_kwh: number;
    is_default: boolean;
    rate_id?: number;
    start_date?: string;
    end_date?: string;
}

export const getCurrentElectricityRate = async (
    date: string,
    roomId?: number
): Promise<number> => {
    // If no roomId provided, return default rate
    if (!roomId) {
        return 6.0;
    }
    
    try {
        const response = await apiClient.get<ElectricityRateResponse>(
            `/rooms/${roomId}/electricity-rate`,
            { params: { date } }
        );
        return response.rate_per_kwh;
    } catch (error) {
        console.error('Error fetching electricity rate:', error);
        // Return default rate on error
        return 6.0;
    }
};

export interface ElectricityCostCalculationRequest {
    final_reading: number;
    reading_date: string; // YYYY-MM-DD
}

export interface ElectricityCostCalculationResponse {
    usage_kwh: number;
    rate_per_kwh: number;
    cost: number;
    previous_reading: number;
}

export const calculateElectricityCost = async (
    roomId: number,
    request: ElectricityCostCalculationRequest
): Promise<ElectricityCostCalculationResponse> => {
    try {
        const response = await apiClient.post<ElectricityCostCalculationResponse>(
            `/rooms/${roomId}/calculate-electricity-cost`,
            {
                final_reading: request.final_reading,
                reading_date: request.reading_date
            }
        );
        return response;
    } catch (error) {
        console.error('Error calculating electricity cost:', error);
        throw error;
    }
};

export const createTenant = async (tenant: Partial<Tenant>) => {
    const data = await apiClient.post<any>('/tenants/', tenant);
    return data;
};

export const updateTenant = async (id: number, updates: Partial<Tenant>) => {
    // Map frontend fields to backend schema
    // Note: first_name and last_name should always be present in the updates object
    // since they're part of the tenant object structure
    const genderValue = updates.gender || Gender.MALE;
    // Map Chinese to English if needed, otherwise use as-is (already English enum)
    const mappedGender = GenderFromChinese[genderValue] || genderValue;
    
    const tenantData: any = {
        first_name: updates.first_name || '',
        last_name: updates.last_name || '',
        gender: mappedGender, // Backend expects 'M', 'F', or 'O'
        birthday: updates.birthday || '',
        personal_id: updates.personal_id || updates.idNumber || '',
        phone: updates.phone || updates.phoneNumber || '',
        email: updates.email || undefined,
        line_id: updates.line_id || updates.lineId || undefined,
        address: updates.address || '',
        emergency_contacts: updates.emergency_contacts?.map(ec => ({
            first_name: ec.first_name,
            last_name: ec.last_name,
            relationship: ec.relationship,
            phone: ec.phone
        })) || []
    };
    
    const data = await apiClient.put<any>(`/tenants/${id}`, tenantData);
    return data;
};

export const recordMeterReading = async (roomId: any, read_amount: number, read_date: string) => {
    // TODO: Add /meter-readings/ endpoint to backend
    try {
        // Placeholder - will need backend endpoint
        return { id: 0, room_id: roomId, read_amount, read_date };
    } catch (error) {
        console.error('Error recording meter reading:', error);
        throw error;
    }
};

export const addPayment = async (invoice: Omit<Invoice, 'id'>) => {
    // TODO: Add /invoices/ endpoint to backend (or use addTransaction)
    throw new Error('Not implemented - backend endpoint needed');
};

export const addCashFlow = async (flow: Omit<CashFlow, 'id'>) => {
    // TODO: Add /cash-flow/ endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export interface ProrationCalculationRequest {
    termination_date: string; // YYYY-MM-DD
}

export interface ProrationCalculationResponse {
    prorated_amount: number;
    monthly_rent: number;
    days_used: number;
    days_in_month: number;
}

export const calculateProration = async (
    leaseId: number,
    request: ProrationCalculationRequest
): Promise<ProrationCalculationResponse> => {
    try {
        const response = await apiClient.post<ProrationCalculationResponse>(
            `/leases/${leaseId}/calculate-proration`,
            {
                termination_date: request.termination_date
            }
        );
        return response;
    } catch (error) {
        console.error('Error calculating proration:', error);
        throw error;
    }
};

// --- Rent Calculation (Backend) ---

export interface RentCalculationRequest {
    monthly_rent: number;
    payment_term_months: number;
    discount: number;
}

export interface RentCalculationResponse {
    total_amount: number;
    base_amount: number;
    discount: number;
}

export interface PeriodEndCalculationRequest {
    period_start: string; // YYYY-MM-DD
    payment_term_months: number;
}

export interface PeriodEndCalculationResponse {
    period_end: string; // YYYY-MM-DD
}

export interface RentNoteRequest {
    base_note?: string;
    discount: number;
}

export interface RentNoteResponse {
    formatted_note: string;
}

export const calculateRentAmount = async (request: RentCalculationRequest): Promise<RentCalculationResponse> => {
    try {
        const response = await apiClient.post<RentCalculationResponse>('/invoices/calculate-rent', {
            monthly_rent: request.monthly_rent,
            payment_term_months: request.payment_term_months,
            discount: request.discount
        });
        return response;
    } catch (error) {
        console.error('Error calculating rent amount:', error);
        throw error;
    }
};

export const calculatePeriodEnd = async (request: PeriodEndCalculationRequest): Promise<PeriodEndCalculationResponse> => {
    try {
        const response = await apiClient.post<PeriodEndCalculationResponse>('/invoices/calculate-period-end', {
            period_start: request.period_start,
            payment_term_months: request.payment_term_months
        });
        return response;
    } catch (error) {
        console.error('Error calculating period end:', error);
        throw error;
    }
};

export const formatRentNote = async (request: RentNoteRequest): Promise<RentNoteResponse> => {
    try {
        const response = await apiClient.post<RentNoteResponse>('/invoices/format-rent-note', {
            base_note: request.base_note || undefined,
            discount: request.discount
        });
        return response;
    } catch (error) {
        console.error('Error formatting rent note:', error);
        throw error;
    }
};

export const terminateContract = async (
    contractId: number, 
    terminationDate: string, 
    reason: string,
    meterReadingDate?: string,
    meterReading?: number
) => {
    const data = await apiClient.post<any>(`/leases/${contractId}/terminate`, {
        termination_date: terminationDate,
        reason: reason || undefined,
        meter_reading_date: meterReadingDate || terminationDate,
        meter_reading: meterReading || undefined
    });
    return data;
};

export const renewContract = async (leaseId: number, renewData: {
    new_end_date: string;
    new_monthly_rent?: number;
    new_deposit?: number;
    new_pay_rent_on?: number;
    new_payment_term?: string;
    new_vehicle_plate?: string;
}) => {
    const data = await apiClient.post<any>(`/leases/${leaseId}/renew`, renewData);
    return data;
};

export const amendContract = async (leaseId: number, amendData: {
    effective_date: string;
    old_rent: number;
    new_rent: number;
    reason: string;
}) => {
    const data = await apiClient.post<any>(`/leases/${leaseId}/amend`, {
        effective_date: amendData.effective_date,
        old_rent: amendData.old_rent,
        new_rent: amendData.new_rent,
        reason: amendData.reason
    });
    return data;
};

export const createContract = async (contract: {
    tenant_id: number;
    room_id: number;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    deposit: number;
    pay_rent_on: number;
    payment_term: string;
    vehicle_plate?: string;
    assets?: Array<{ type: string; quantity: number }>;
}) => {
    // Payment term is already in Chinese format, pass through directly
    const contractData: any = {
        tenant_id: contract.tenant_id,
        room_id: contract.room_id,
        start_date: contract.start_date,
        end_date: contract.end_date,
        monthly_rent: contract.monthly_rent,
        deposit: contract.deposit,
        pay_rent_on: contract.pay_rent_on,
        payment_term: contract.payment_term, // English enum value: 'monthly', 'seasonal', 'semi-annual', 'annual'
    };
    
    // Only include optional fields if they have values
    if (contract.vehicle_plate) {
        contractData.vehicle_plate = contract.vehicle_plate;
    }
    
    // Only include assets if provided and not empty
    if (contract.assets && contract.assets.length > 0) {
        contractData.assets = contract.assets;
    }
    
    const data = await apiClient.post<any>('/leases/', contractData);
    return data;
};

export const submitContract = async (leaseId: number) => {
    const data = await apiClient.post<any>(`/leases/${leaseId}/submit`);
    return data;
};

export const updateContract = async (id: number, updates: any) => {
    // Map frontend contract fields to backend schema
    const updateData: any = {};
    
    if (updates.monthly_rent !== undefined) {
        updateData.monthly_rent = updates.monthly_rent;
    }
    if (updates.payment_term !== undefined) {
        updateData.payment_term = updates.payment_term;
    }
    if (updates.start_date !== undefined) {
        updateData.start_date = updates.start_date;
    }
    if (updates.end_date !== undefined) {
        updateData.end_date = updates.end_date;
    }
    if (updates.deposit !== undefined) {
        updateData.deposit = updates.deposit;
    }
    if (updates.pay_rent_on !== undefined) {
        updateData.pay_rent_on = updates.pay_rent_on;
    }
    if (updates.vehicle_plate !== undefined) {
        updateData.vehicle_plate = updates.vehicle_plate;
    }
    if (updates.assets !== undefined) {
        updateData.assets = updates.assets;
    }
    
    const data = await apiClient.put<any>(`/leases/${id}`, updateData);
    return data;
};

export const getDashboardStats = async () => {
    const stats = await apiClient.get<any>('/dashboard/stats');
    return {
        totalRooms: stats.totalRooms || 0,
        occupied: stats.occupied || 0,
        occupancyRate: stats.occupancyRate?.toString() || '0',
        overdueTotal: stats.overdueTotal || 0,
        overdueCount: stats.overdueCount || 0
    };
};

export const getManager = async (): Promise<{ name: string | null; phone: string | null }> => {
    try {
        const data = await apiClient.get<{ name: string | null; phone: string | null }>('/users/manager');
        return data;
    } catch (error) {
        console.error('Error fetching manager:', error);
        return { name: null, phone: null };
    }
};

export const getContractForPDF = async (leaseId: number): Promise<any> => {
    try {
        const data = await apiClient.get<any>(`/leases/${leaseId}/contract`);
        return data;
    } catch (error) {
        console.error('Error fetching contract for PDF:', error);
        throw error;
    }
};
