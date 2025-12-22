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
        name: t.name || `${t.first_name} ${t.last_name}`,
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

export const getTenantInRoom = async (roomId: any): Promise<TenantWithContract | null> => {
    try {
        const leases = await apiClient.get<any[]>('/leases/?room_id=' + roomId + '&status=active');
        const activeLease = leases.find(l => l.status === 'active');
        
        if (!activeLease) return null;

        // Get tenant details
        const tenant = await apiClient.get<any>(`/tenants/${activeLease.tenant_id}`);
        
        return {
            ...tenant,
            currentContract: {
                ...activeLease,
                rentAmount: Number(activeLease.monthly_rent),
                depositAmount: Number(activeLease.deposit),
                itemsIssued: activeLease.assets || [],
                paymentFrequency: activeLease.payment_term,
                depositStatus: 'Paid' as any
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

export const updateTenant = async (id: number, updates: any) => {
    // TODO: Add PUT /tenants/{id} endpoint to backend
    throw new Error('Not implemented - backend endpoint needed');
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

export const terminateContract = async (contractId: number, date: string, reason: string) => {
    await apiClient.post(`/leases/${contractId}/terminate`, {
        termination_date: date,
        reason: reason
    });
};

export const createContract = async (contract: any) => {
    const data = await apiClient.post<any>('/leases/', contract);
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
