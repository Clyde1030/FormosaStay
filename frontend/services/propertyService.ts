import { apiClient } from './apiClient';
import { 
    Building, Room, Tenant, Lease, LeaseStatus, 
    TenantWithLease, Payment, CashFlow, 
    ElectricityRate, MeterReading, Transaction, Expense,
    TenantWithContract, Contract, PaymentFrequency, DepositStatus,
    CashFlowCategory
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

export const getTenants = async (): Promise<Tenant[]> => {
    const data = await apiClient.get<any[]>('/tenants/');
    return data.map(t => ({
        ...t,
        name: t.name || `${t.last_name}${t.first_name}`,
        phoneNumber: t.phoneNumber || t.phone,
        idNumber: t.idNumber || t.personal_id,
        emergency_contacts: t.emergency_contacts || []
    }));
};

export const fetchTenantsWithDetails = async (): Promise<TenantWithLease[]> => {
    // Get tenants from the view which already includes active lease info
    const tenants = await getTenants();
    
    return tenants.map(t => {
        return {
            ...t,
            active_lease: t.active_lease,
            room: t.room || t.active_lease?.room ? {
                ...(t.room || t.active_lease.room),
                roomNumber: (t.room || t.active_lease?.room)?.roomNumber || 
                           `${(t.room || t.active_lease?.room)?.floor_no}${(t.room || t.active_lease?.room)?.room_no}`
            } : undefined,
            building: t.building || t.active_lease?.room?.building
        };
    });
};

// --- Transaction & Payment Mapping ---
// Note: These endpoints need to be added to the backend
// For now, returning empty arrays as placeholders

export const getTransactions = async (): Promise<Transaction[]> => {
    // TODO: Add /payments/ endpoint to backend
    try {
        // Placeholder - will need backend endpoint
        return [];
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
};

export const getTransactionsByRoom = async (roomId: any): Promise<Transaction[]> => {
    try {
        const payments = await apiClient.get<any[]>(`/rooms/${roomId}/payments`);
        
        return payments.map(p => ({
            id: p.invoice_id?.toString() || '',
            roomId: roomId,
            tenantName: p.tenant_name || '',
            contractId: p.lease_id,
            type: p.category === '房租' ? 'Rent' : 
                  p.category === '電費' ? 'Electricity' : 
                  p.category === '罰款' ? 'Fee' : 
                  p.category === '押金' ? 'Deposit' : 'Rent',
            amount: Number(p.due_amount) || 0,
            dueDate: p.due_date || '',
            status: p.payment_status_en === 'Paid' ? 'Paid' :
                    p.payment_status_en === 'Unpaid' ? 'Unpaid' :
                    p.payment_status_en === 'Partial' ? 'Unpaid' : 'Unpaid',
            paidDate: p.payment_status_en === 'Paid' ? p.due_date : undefined,
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
                vehicle_plate: tenant.active_lease.vehicle_plate
            } : undefined,
            room: tenant.active_lease?.room ? {
                id: tenant.active_lease.room.id,
                roomNumber: tenant.active_lease.room.roomNumber || `${tenant.active_lease.room.floor_no}${tenant.active_lease.room.room_no}`,
                building_id: tenant.active_lease.room.building_id
            } : undefined
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
                rentAmount: Number(tenantData.monthly_rent) || 0,
                depositAmount: Number(tenantData.deposit) || 0,
                startDate: tenantData.lease_start_date,
                endDate: tenantData.early_termination_date || tenantData.lease_end_date,
                paymentFrequency: tenantData.payment_term as PaymentFrequency,
                depositStatus: DepositStatus.PAID,
                itemsIssued: Array.isArray(tenantData.assets) ? tenantData.assets : [],
                status: tenantData.lease_status,
                vehicle_plate: tenantData.vehicle_plate,
                pay_rent_on: tenantData.pay_rent_on
            },
            room: {
                id: tenantData.room_id,
                roomNumber: tenantData.room_number || `${tenantData.floor_no}${tenantData.room_no}`,
                building_id: tenantData.building_id
            }
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
    // TODO: Add /cash-flow/ endpoint to backend
    try {
        return [];
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return [];
    }
};

export const getCashFlowCategories = async (): Promise<CashFlowCategory[]> => {
    try {
        const data = await apiClient.get<CashFlowCategory[]>('/cash-flow/categories');
        return data;
    } catch (error) {
        console.error('Error fetching cash flow categories:', error);
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
    // TODO: Add /payments/ endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    // TODO: Add PUT /payments/{id} endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const deleteTransaction = async (id: string) => {
    // TODO: Add DELETE /payments/{id} endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const addExpense = async (ex: Partial<Expense>) => {
    // TODO: Add /cash-flow/ endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const updateExpense = async (id: string, updates: Partial<Expense>) => {
    // TODO: Add PUT /cash-flow/{id} endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const deleteExpense = async (id: string) => {
    // TODO: Add DELETE /cash-flow/{id} endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const addElectricityRate = async (rate: Partial<ElectricityRate>) => {
    // TODO: Add /electricity-rates/ endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const deleteElectricityRate = async (id: string | number) => {
    // TODO: Add DELETE /electricity-rates/{id} endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const getCurrentElectricityRate = (date: string, roomId?: any): number => {
    // In a real app, this should be fetched from the DB state or an async call
    return 5.0; 
};

export const createTenant = async (tenant: Partial<Tenant>) => {
    const data = await apiClient.post<any>('/tenants/', tenant);
    return data;
};

export const updateTenant = async (id: number, updates: Partial<Tenant>) => {
    // Map frontend fields to backend schema
    // Note: first_name and last_name should always be present in the updates object
    // since they're part of the tenant object structure
    const tenantData: any = {
        first_name: updates.first_name || '',
        last_name: updates.last_name || '',
        gender: updates.gender || '男', // Default to '男' (valid Chinese value)
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

export const addPayment = async (payment: Omit<Payment, 'id'>) => {
    // TODO: Add /payments/ endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const addCashFlow = async (flow: Omit<CashFlow, 'id'>) => {
    // TODO: Add /cash-flow/ endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
};

export const calculateProration = (rent: number, terminationDate: string, endDate: string): number => {
    const term = new Date(terminationDate);
    const daysInMonth = new Date(term.getFullYear(), term.getMonth() + 1, 0).getDate();
    const daysUsed = term.getDate();
    return Math.round((daysUsed / daysInMonth) * rent);
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
        const response = await apiClient.post<RentCalculationResponse>('/payments/calculate-rent', {
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
        const response = await apiClient.post<PeriodEndCalculationResponse>('/payments/calculate-period-end', {
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
        const response = await apiClient.post<RentNoteResponse>('/payments/format-rent-note', {
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
        payment_term: contract.payment_term, // Already in Chinese: '月繳', '季繳', '半年繳', '年繳'
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

export const updateContract = async (id: number, updates: any) => {
    // TODO: Add PUT /leases/{id} endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
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
