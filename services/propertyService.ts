
import { supabase } from './supabaseClient';
import { 
    Building, Room, Tenant, Lease, LeaseStatus, 
    TenantWithLease, Payment, CashFlow, 
    ElectricityRate, MeterReading, Transaction, Expense,
    TenantWithContract, Contract
} from '../types';

// --- Data Fetching ---

export const getBuildings = async (): Promise<Building[]> => {
    const { data, error } = await supabase.from('building').select('*').order('building_no');
    if (error) throw error;
    return (data || []).map(b => ({
        ...b,
        name: `Building ${b.building_no}`,
        totalRooms: 0
    }));
};

export const getRooms = async (buildingId?: number): Promise<Room[]> => {
    let query = supabase.from('room').select('*, building(*)').order('floor_no').order('room_no');
    if (buildingId) query = query.eq('building_id', buildingId);
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(r => ({
        ...r,
        buildingId: r.building_id,
        roomNumber: `${r.floor_no}${r.room_no}`,
        sizePing: r.size_ping,
        status: 'Vacant', // Note: status is determined later by checking active leases
        currentMeterReading: 0
    }));
};

export const getTenants = async (): Promise<Tenant[]> => {
    const { data, error } = await supabase.from('tenant').select('*').order('last_name');
    if (error) throw error;
    return (data || []).map(t => ({
        ...t,
        name: `${t.first_name} ${t.last_name}`,
        phoneNumber: t.phone,
        idNumber: t.personal_id,
        homeAddress: t.address
    }));
};

export const fetchTenantsWithDetails = async (): Promise<TenantWithLease[]> => {
    const { data, error } = await supabase
        .from('tenant')
        .select(`
            *,
            lease (*, room (*, building (*)))
        `);
    
    if (error) throw error;

    return (data || []).map(t => {
        const activeLease = (t.lease as any[] || []).find((l: any) => l.status === 'active');
        return {
            ...t,
            name: `${t.first_name} ${t.last_name}`,
            phoneNumber: t.phone,
            idNumber: t.personal_id,
            homeAddress: t.address,
            active_lease: activeLease,
            room: activeLease?.room ? {
                ...activeLease.room,
                roomNumber: `${activeLease.room.floor_no}${activeLease.room.room_no}`
            } : undefined,
            building: activeLease?.room?.building
        };
    });
};

// --- Transaction & Payment Mapping ---

export const getTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('payment')
        .select(`
            *,
            lease (
                tenant (first_name, last_name),
                room (room_no, floor_no)
            )
        `)
        .order('period_start', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => {
        const tenant = (p.lease as any)?.tenant;
        const room = (p.lease as any)?.room;
        return {
            id: p.id.toString(),
            contractId: p.lease_id,
            tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown',
            roomId: p.lease?.room_id,
            type: p.category === 'rent' ? 'Rent' : p.category === 'electricity' ? 'Electricity' : 'Fee',
            amount: Number(p.due_amount),
            dueDate: p.period_end, // approximation
            status: p.status === 'paid' ? 'Paid' : 'Unpaid',
            periodStart: p.period_start,
            periodEnd: p.period_end
        };
    });
};

export const getTransactionsByRoom = async (roomId: any): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('payment')
        .select(`
            *,
            lease!inner (
                tenant (first_name, last_name),
                room_id
            )
        `)
        .eq('lease.room_id', roomId)
        .order('period_start', { ascending: false });

    if (error) throw error;

    return (data || []).map(p => {
        const tenant = (p.lease as any)?.tenant;
        return {
            id: p.id.toString(),
            contractId: p.lease_id,
            tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown',
            roomId: roomId,
            type: p.category === 'rent' ? 'Rent' : p.category === 'electricity' ? 'Electricity' : 'Fee',
            amount: Number(p.due_amount),
            dueDate: p.period_end,
            status: p.status === 'paid' ? 'Paid' : 'Unpaid',
            periodStart: p.period_start,
            periodEnd: p.period_end
        };
    });
};

export const getTenantInRoom = async (roomId: any): Promise<TenantWithContract | null> => {
    const { data, error } = await supabase
        .from('lease')
        .select(`
            *,
            tenant (*),
            room (*)
        `)
        .eq('room_id', roomId)
        .eq('status', 'active')
        .maybeSingle();

    if (error || !data) return null;

    const t = data.tenant as any;
    const r = data.room as any;

    return {
        ...t,
        name: `${t.first_name} ${t.last_name}`,
        phoneNumber: t.phone,
        idNumber: t.personal_id,
        homeAddress: t.address,
        currentContract: {
            ...data,
            rentAmount: Number(data.monthly_rent),
            depositAmount: Number(data.deposit),
            itemsIssued: [], // Would fetch from lease_asset if needed
            paymentFrequency: data.payment_term as any,
            depositStatus: 'Paid' as any
        },
        room: {
            ...r,
            roomNumber: `${r.floor_no}${r.room_no}`
        }
    };
};

export const getExpenses = async (): Promise<Expense[]> => {
    const { data, error } = await supabase
        .from('cash_flow')
        .select(`
            *,
            cash_flow_category!inner (*)
        `)
        .eq('cash_flow_category.direction', 'out')
        .order('flow_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(cf => ({
        id: cf.id.toString(),
        category: cf.cash_flow_category?.name || 'Misc',
        amount: Number(cf.amount),
        description: cf.note || '',
        date: cf.flow_date
    }));
};

export const getElectricityRates = async (): Promise<ElectricityRate[]> => {
    const { data, error } = await supabase.from('electricity_rate').select('*');
    if (error) throw error;
    return (data || []).map(r => ({
        id: r.id,
        effectiveDate: r.start_date,
        ratePerDegree: Number(r.rate_per_kwh),
        roomId: r.room_id
    }));
};

// --- Operations ---

export const addTransaction = async (tx: Partial<Transaction>) => {
    const { data, error } = await supabase.from('payment').insert({
        lease_id: tx.contractId,
        category: tx.type?.toLowerCase() === 'rent' ? 'rent' : 'electricity',
        period_start: tx.periodStart,
        period_end: tx.periodEnd,
        due_amount: tx.amount,
        status: tx.status?.toLowerCase() === 'paid' ? 'paid' : 'unpaid'
    }).select().single();
    if (error) throw error;
    return data;
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const pId = parseInt(id);
    const { error } = await supabase.from('payment').update({
        status: updates.status?.toLowerCase(),
        paid_amount: updates.status?.toLowerCase() === 'paid' ? updates.amount : undefined
    }).eq('id', pId);
    if (error) throw error;
};

export const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('payment').delete().eq('id', parseInt(id));
    if (error) throw error;
};

export const addExpense = async (ex: Partial<Expense>) => {
    // Requires a valid category_id and cash_account_id from your schema
    // This is a simplified mock insertion for the demo
    const { data, error } = await supabase.from('cash_flow').insert({
        amount: ex.amount,
        flow_date: ex.date,
        note: ex.description,
        payment_method: 'cash',
        category_id: 1, // Placeholder
        cash_account_id: 1 // Placeholder
    }).select().single();
    if (error) throw error;
    return data;
};

export const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const { error } = await supabase.from('cash_flow').update({
        amount: updates.amount,
        flow_date: updates.date,
        note: updates.description
    }).eq('id', parseInt(id));
    if (error) throw error;
};

export const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('cash_flow').delete().eq('id', parseInt(id));
    if (error) throw error;
};

export const addElectricityRate = async (rate: Partial<ElectricityRate>) => {
    const { data, error } = await supabase.from('electricity_rate').insert({
        start_date: rate.effectiveDate,
        end_date: '2099-12-31',
        rate_per_kwh: rate.ratePerDegree,
        building_id: 1, // Placeholder: need building context
        room_id: rate.roomId
    }).select().single();
    if (error) throw error;
    return data;
};

export const deleteElectricityRate = async (id: string | number) => {
    const { error } = await supabase.from('electricity_rate').delete().eq('id', id);
    if (error) throw error;
};

export const getCurrentElectricityRate = (date: string, roomId?: any): number => {
    // In a real app, this should be fetched from the DB state or an async call
    return 5.0; 
};

export const createTenant = async (tenant: Partial<Tenant>) => {
    const { data, error } = await supabase.from('tenant').insert(tenant).select().single();
    if (error) throw error;
    return data;
};

export const updateTenant = async (id: number, updates: any) => {
    const { error } = await supabase.from('tenant').update(updates).eq('id', id);
    if (error) throw error;
};

export const recordMeterReading = async (roomId: any, read_amount: number, read_date: string) => {
    const { data, error } = await supabase.from('meter_reading').insert({ 
        room_id: typeof roomId === 'string' ? parseInt(roomId) : roomId, 
        read_amount, 
        read_date 
    }).select().single();
    if (error) throw error;
    return data;
};

export const addPayment = async (payment: Omit<Payment, 'id'>) => {
    const { data, error } = await supabase.from('payment').insert(payment).select().single();
    if (error) throw error;
    return data;
};

export const addCashFlow = async (flow: Omit<CashFlow, 'id'>) => {
    const { data, error } = await supabase.from('cash_flow').insert(flow).select().single();
    if (error) throw error;
    return data;
};

export const calculateProration = (rent: number, terminationDate: string, endDate: string): number => {
    const term = new Date(terminationDate);
    const daysInMonth = new Date(term.getFullYear(), term.getMonth() + 1, 0).getDate();
    const daysUsed = term.getDate();
    return Math.round((daysUsed / daysInMonth) * rent);
};

export const terminateContract = async (contractId: number, date: string, reason: string) => {
    const { error } = await supabase.from('lease').update({ 
        status: 'terminated', 
        early_termination_date: date 
    }).eq('id', contractId);
    if (error) throw error;
};

export const createContract = async (contract: any) => {
    const { data, error } = await supabase.from('lease').insert(contract).select().single();
    if (error) throw error;
    return data;
};

export const updateContract = async (id: number, updates: any) => {
    const { error } = await supabase.from('lease').update(updates).eq('id', id);
    if (error) throw error;
};

export const getDashboardStats = async () => {
    const [rooms, leases, payments] = await Promise.all([
        supabase.from('room').select('id', { count: 'exact', head: true }),
        supabase.from('lease').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('payment').select('due_amount, paid_amount').eq('status', 'unpaid')
    ]);

    const totalRooms = rooms.count || 0;
    const occupied = leases.count || 0;
    const occupancyRate = totalRooms > 0 ? (occupied / totalRooms) * 100 : 0;
    
    const overdueTotal = (payments.data || []).reduce((acc, p) => acc + (Number(p.due_amount) - Number(p.paid_amount)), 0);

    return {
        totalRooms,
        occupied,
        occupancyRate: occupancyRate.toFixed(1),
        overdueTotal,
        overdueCount: payments.data?.length || 0
    };
};
