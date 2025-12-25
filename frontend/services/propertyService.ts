import { apiClient } from './apiClient';
import { 
    Building, Room, Tenant, Lease, LeaseStatus, 
    TenantWithLease, Payment, CashFlow, 
    ElectricityRate, MeterReading, Transaction, Expense,
    TenantWithContract, Contract
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
        homeAddress: t.homeAddress || t.address
    }));
};

export const fetchTenantsWithDetails = async (): Promise<TenantWithLease[]> => {
    // Get tenants and leases separately, then combine
    const tenants = await getTenants();
    const leases = await apiClient.get<any[]>('/leases/');
    
    const activeLeasesByTenant: { [key: number]: any } = {};
    leases.filter(l => l.status === 'active').forEach(lease => {
        activeLeasesByTenant[lease.tenant_id] = lease;
    });

    return tenants.map(t => {
        const activeLease = activeLeasesByTenant[t.id];
        return {
            ...t,
            active_lease: activeLease,
            room: activeLease?.room ? {
                ...activeLease.room,
                roomNumber: activeLease.room.roomNumber || `${activeLease.room.floor_no}${activeLease.room.room_no}`
            } : undefined,
            building: activeLease?.room?.building
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
    // TODO: Add /payments/?room_id= endpoint to backend
    try {
        return [];
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
            homeAddress: tenant.homeAddress || tenant.address,
            emergency_contacts: tenant.emergency_contacts || [],
            currentContract: tenant.active_lease ? {
                id: tenant.active_lease.id,
                rentAmount: Number(tenant.active_lease.monthly_rent),
                depositAmount: Number(tenant.active_lease.deposit),
                itemsIssued: [],
                paymentFrequency: 'monthly' as any,
                depositStatus: 'Paid' as any,
                startDate: tenant.active_lease.start_date,
                endDate: tenant.active_lease.end_date,
                status: tenant.active_lease.status,
                vehicle_plate: tenant.active_lease.vehicle_plate
            } : undefined,
            room: tenant.active_lease?.room ? {
                id: tenant.active_lease.room.id,
                roomNumber: tenant.active_lease.room.roomNumber || `${tenant.active_lease.room.floor_no}${tenant.active_lease.room.room_no}`
            } : undefined
        };
    } catch (error) {
        console.error('Error fetching tenant by ID:', error);
        return null;
    }
};

export const getTenantInRoom = async (roomId: any): Promise<TenantWithContract | null> => {
    try {
        const leases = await apiClient.get<any[]>('/leases/?room_id=' + roomId + '&status=active');
        const activeLease = leases.find(l => l.status === 'active');
        
        if (!activeLease) return null;

        // Get tenant details
        const tenant = await apiClient.get<any>(`/tenants/${activeLease.tenant_id}`);
        
        return {
            ...tenant,
            name: tenant.name || `${tenant.last_name}${tenant.first_name}`,
            phoneNumber: tenant.phoneNumber || tenant.phone,
            idNumber: tenant.idNumber || tenant.personal_id,
            homeAddress: tenant.homeAddress || tenant.address,
            emergency_contacts: tenant.emergency_contacts || [],
            currentContract: {
                ...activeLease,
                rentAmount: Number(activeLease.monthly_rent),
                depositAmount: Number(activeLease.deposit),
                itemsIssued: activeLease.assets || [],
                paymentFrequency: activeLease.payment_term,
                depositStatus: 'Paid' as any,
                vehicle_plate: activeLease.vehicle_plate
            },
            room: {
                id: activeLease.room_id,
                roomNumber: activeLease.room?.roomNumber || ''
            }
        };
    } catch (error) {
        console.error('Error fetching tenant in room:', error);
        return null;
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
    const tenantData: any = {
        first_name: updates.first_name || '',
        last_name: updates.last_name || '',
        gender: updates.gender || 'M',
        birthday: updates.birthday || '',
        personal_id: updates.personal_id || updates.idNumber || '',
        phone: updates.phone || updates.phoneNumber || '',
        email: updates.email || undefined,
        line_id: updates.line_id || updates.lineId || undefined,
        address: updates.address || updates.homeAddress || '',
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
    assets?: Array<{ asset_type: string; quantity: number }>;
}) => {
    // Map payment_term from UI format to backend format
    const paymentTermMap: { [key: string]: string } = {
        'Monthly': 'monthly',
        'Quarterly': 'quarterly',
        'Semiannually': 'semiannually',
        'Yearly': 'yearly'
    };
    
    const contractData = {
        tenant_id: contract.tenant_id,
        room_id: contract.room_id,
        start_date: contract.start_date,
        end_date: contract.end_date,
        monthly_rent: contract.monthly_rent,
        deposit: contract.deposit,
        pay_rent_on: contract.pay_rent_on,
        payment_term: paymentTermMap[contract.payment_term] || contract.payment_term.toLowerCase(),
        vehicle_plate: contract.vehicle_plate || undefined,
        assets: contract.assets || []
    };
    
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
