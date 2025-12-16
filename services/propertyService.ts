import { Building, Room, Tenant, Contract, PaymentFrequency, ContractStatus, DepositStatus, TenantWithContract, Transaction, Expense, ElectricityRate } from '../types';

// --- Mock Data ---

const BUILDINGS: Building[] = [
    { id: 'b1', name: 'Xinyi Heights', address: 'No. 123, Xinyi Rd, Taipei', totalRooms: 15 },
    { id: 'b2', name: 'Da\'an Scholar House', address: 'No. 45, Heping E Rd, Taipei', totalRooms: 20 },
    { id: 'b3', name: 'Zhongshan Lofts', address: 'No. 88, Linsen N Rd, Taipei', totalRooms: 12 },
    { id: 'b4', name: 'Neihu Tech Dorm', address: 'No. 10, Ruiguang Rd, Taipei', totalRooms: 13 },
];

const ROOMS: Room[] = [];
let roomCounter = 1;
BUILDINGS.forEach(b => {
    for (let i = 1; i <= b.totalRooms; i++) {
        ROOMS.push({
            id: `r${roomCounter}`,
            buildingId: b.id,
            roomNumber: `${Math.floor(i/5) + 2}0${i%5 === 0 ? 5 : i%5}`,
            floor: Math.floor(i/5) + 2,
            baseRent: 12000 + (Math.floor(Math.random() * 5) * 1000),
            sizePing: 8 + Math.floor(Math.random() * 4),
            status: Math.random() > 0.3 ? 'Occupied' : 'Vacant',
            currentMeterReading: 1000 + Math.floor(Math.random() * 5000)
        });
        roomCounter++;
    }
});

const TENANTS: Tenant[] = [
    {
        id: 't1',
        name: 'Chen Wei-Hao',
        phoneNumber: '0912-345-678',
        idNumber: 'A123456789',
        homeAddress: 'Kaohsiung City, Sanmin Dist.',
        birthday: '1990-05-20',
        lineId: 'weihao90',
        motorcyclePlate: 'ABC-123',
        notes: 'Works at TSMC, prefers Line contact.'
    },
    {
        id: 't2',
        name: 'Sarah Jenkins',
        phoneNumber: '0987-654-321',
        idNumber: 'ARC-987654321',
        homeAddress: 'USA',
        birthday: '1995-11-12',
        lineId: 'sarah_j',
        motorcyclePlate: 'XYZ-999',
        notes: 'English teacher. ARC valid until 2026.'
    },
    {
        id: 't3',
        name: 'Lin Yi-Chun',
        phoneNumber: '0922-333-444',
        idNumber: 'B234567890',
        homeAddress: 'Taichung City',
        birthday: '1988-02-14',
        notes: 'Pays rent early usually.'
    }
];

const CONTRACTS: Contract[] = [
    {
        id: 'c1',
        tenantId: 't1',
        roomId: 'r1',
        startDate: '2023-09-01',
        endDate: '2024-08-31',
        rentAmount: 14000,
        paymentFrequency: PaymentFrequency.MONTHLY,
        depositAmount: 28000,
        depositStatus: DepositStatus.PAID,
        itemsIssued: ['Key x2', 'Fob'],
        status: ContractStatus.ACTIVE
    },
    {
        id: 'c2',
        tenantId: 't2',
        roomId: 'r5',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        rentAmount: 16000,
        paymentFrequency: PaymentFrequency.QUARTERLY,
        depositAmount: 32000,
        depositStatus: DepositStatus.PAID,
        itemsIssued: ['Key', 'AC Remote'],
        status: ContractStatus.ACTIVE
    },
    {
        id: 'c3',
        tenantId: 't3',
        roomId: 'r18',
        startDate: '2023-06-01',
        endDate: '2024-05-31',
        rentAmount: 13000,
        paymentFrequency: PaymentFrequency.MONTHLY,
        depositAmount: 26000,
        depositStatus: DepositStatus.PAID,
        itemsIssued: ['Key'],
        status: ContractStatus.ACTIVE
    }
];

// Mock Transactions
let TRANSACTIONS: Transaction[] = [
    {
        id: 'tx1', contractId: 'c1', tenantName: 'Chen Wei-Hao', roomId: 'r1', type: 'Rent',
        amount: 14000, dueDate: '2024-05-01', paidDate: '2024-04-28', status: 'Paid', method: 'Transfer',
        periodStart: '2024-05-01', periodEnd: '2024-05-31', note: 'Early payment discount applied (none)'
    },
    {
        id: 'tx1_old', contractId: 'c1', tenantName: 'Chen Wei-Hao', roomId: 'r1', type: 'Rent',
        amount: 14000, dueDate: '2024-04-01', paidDate: '2024-03-29', status: 'Paid', method: 'Transfer',
        periodStart: '2024-04-01', periodEnd: '2024-04-30'
    },
     {
        id: 'tx1_old2', contractId: 'c1', tenantName: 'Chen Wei-Hao', roomId: 'r1', type: 'Rent',
        amount: 14000, dueDate: '2024-03-01', paidDate: '2024-02-28', status: 'Paid', method: 'Transfer',
        periodStart: '2024-03-01', periodEnd: '2024-03-31'
    },
    {
        id: 'tx2', contractId: 'c1', tenantName: 'Chen Wei-Hao', roomId: 'r1', type: 'Electricity',
        amount: 1250, dueDate: '2024-05-05', paidDate: '2024-05-05', status: 'Paid', method: 'LinePay',
        description: 'April Usage', readingStart: 1000, readingEnd: 1250, periodStart: '2024-04-01', periodEnd: '2024-04-30'
    },
    {
        id: 'tx2_old', contractId: 'c1', tenantName: 'Chen Wei-Hao', roomId: 'r1', type: 'Electricity',
        amount: 1100, dueDate: '2024-04-05', paidDate: '2024-04-05', status: 'Paid', method: 'LinePay',
        description: 'March Usage', readingStart: 800, readingEnd: 1000, periodStart: '2024-03-01', periodEnd: '2024-03-31'
    },
    {
        id: 'tx3', contractId: 'c2', tenantName: 'Sarah Jenkins', roomId: 'r5', type: 'Rent',
        amount: 16000, dueDate: '2024-05-01', status: 'Overdue',
        periodStart: '2024-05-01', periodEnd: '2024-05-31'
    },
    // Machine Income
    {
        id: 'tx4', type: 'MachineIncome', amount: 3500, dueDate: '2024-05-01', paidDate: '2024-05-01', status: 'Paid',
        description: 'Washer/Dryer B1'
    }
];

// Mock Expenses
let EXPENSES: Expense[] = [
    { id: 'e1', category: 'Maintenance', amount: 2500, date: '2024-05-02', description: 'AC Repair Room 205' },
    { id: 'e2', category: 'Cleaning', amount: 8000, date: '2024-05-01', description: 'Monthly Common Area Cleaning' },
    { id: 'e3', category: 'Utilities', amount: 3200, date: '2024-05-05', description: 'Public Electricity B1' }
];

// Electricity Rates
let ELECTRICITY_RATES: ElectricityRate[] = [
    { id: 'er1', effectiveDate: '2023-01-01', ratePerDegree: 5.0 },
    { id: 'er2', effectiveDate: '2024-06-01', ratePerDegree: 5.5 } // Summer rate
];

// --- Service Logic ---

export const getBuildings = () => BUILDINGS;
export const getRooms = () => ROOMS;
export const getTenants = () => TENANTS;
export const getContracts = () => CONTRACTS;

export const getTenantsWithDetails = (): TenantWithContract[] => {
    return TENANTS.map(t => {
        const contract = CONTRACTS.find(c => c.tenantId === t.id && c.status === ContractStatus.ACTIVE);
        const room = contract ? ROOMS.find(r => r.id === contract.roomId) : undefined;
        const building = room ? BUILDINGS.find(b => b.id === room.buildingId) : undefined;
        return {
            ...t,
            currentContract: contract,
            room,
            building
        };
    });
};

export const getTenantInRoom = (roomId: string): TenantWithContract | null => {
    const contract = CONTRACTS.find(c => c.roomId === roomId && c.status === ContractStatus.ACTIVE);
    if (!contract) return null;
    const tenant = TENANTS.find(t => t.id === contract.tenantId);
    if (!tenant) return null;
    const room = ROOMS.find(r => r.id === roomId);
    const building = room ? BUILDINGS.find(b => b.id === room.buildingId) : undefined;
    
    return {
        ...tenant,
        currentContract: contract,
        room,
        building
    };
};

// --- Financial Logic ---

export const getTransactions = () => [...TRANSACTIONS];
export const getExpenses = () => [...EXPENSES];
export const getElectricityRates = () => [...ELECTRICITY_RATES];

export const addElectricityRate = (rate: Partial<ElectricityRate>) => {
    const newRate: ElectricityRate = {
        id: `er${Date.now()}`,
        effectiveDate: rate.effectiveDate!,
        ratePerDegree: Number(rate.ratePerDegree),
        roomId: rate.roomId
    };
    ELECTRICITY_RATES.push(newRate);
    ELECTRICITY_RATES.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
};

export const deleteElectricityRate = (id: string) => {
    ELECTRICITY_RATES = ELECTRICITY_RATES.filter(r => r.id !== id);
};

export const getCurrentElectricityRate = (dateStr: string, roomId?: string): number => {
    const targetDate = new Date(dateStr);
    
    // 1. Try to find a room-specific rate
    if (roomId) {
        const roomRates = ELECTRICITY_RATES.filter(r => r.roomId === roomId && new Date(r.effectiveDate) <= targetDate);
        if (roomRates.length > 0) {
            roomRates.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
            return roomRates[0].ratePerDegree;
        }
    }

    // 2. Fallback to global rate
    const globalRates = ELECTRICITY_RATES.filter(r => !r.roomId && new Date(r.effectiveDate) <= targetDate);
    if (globalRates.length > 0) {
        globalRates.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
        return globalRates[0].ratePerDegree;
    }

    return 5.0; // Default fallback
};

export const addTransaction = (tx: Partial<Transaction>) => {
    const newTx: Transaction = {
        id: `tx${Date.now()}`,
        status: tx.status || 'Pending',
        ...tx
    } as Transaction;
    TRANSACTIONS.unshift(newTx);
    return newTx;
};

export const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    const idx = TRANSACTIONS.findIndex(t => t.id === id);
    if (idx !== -1) {
        TRANSACTIONS[idx] = { ...TRANSACTIONS[idx], ...updates };
    }
};

export const deleteTransaction = (id: string) => {
    TRANSACTIONS = TRANSACTIONS.filter(t => t.id !== id);
};

export const addExpense = (ex: Partial<Expense>) => {
    const newEx: Expense = {
        id: `ex${Date.now()}`,
        category: ex.category || 'Misc',
        amount: Number(ex.amount),
        date: ex.date || new Date().toISOString().split('T')[0],
        description: ex.description || '',
        attachmentName: ex.attachmentName
    };
    EXPENSES.unshift(newEx);
    return newEx;
};

export const updateExpense = (id: string, updates: Partial<Expense>) => {
    const idx = EXPENSES.findIndex(e => e.id === id);
    if (idx !== -1) {
        EXPENSES[idx] = { ...EXPENSES[idx], ...updates };
    }
};

export const deleteExpense = (id: string) => {
    EXPENSES = EXPENSES.filter(e => e.id !== id);
};

export const recordMeterReading = (roomId: string, newReading: number, readingDate: string) => {
    const roomIdx = ROOMS.findIndex(r => r.id === roomId);
    if (roomIdx === -1) return;

    const oldReading = ROOMS[roomIdx].currentMeterReading;
    // Removed strict check to allow corrections, but usually logic implies forward movement.
    // We'll calculate usage. If usage is negative, maybe it's a meter reset or correction, handled by admin.
    const usage = newReading - oldReading;
    
    // Pass roomId to get specific rate if exists
    const rate = getCurrentElectricityRate(readingDate, roomId);
    const cost = Math.max(0, usage) * rate; 

    // Update Room
    ROOMS[roomIdx].currentMeterReading = newReading;

    // Find Active Contract to charge tenant
    const contract = CONTRACTS.find(c => c.roomId === roomId && c.status === ContractStatus.ACTIVE);
    if (contract) {
        const tenant = TENANTS.find(t => t.id === contract.tenantId);
        
        // Generate Bill Transaction
        addTransaction({
            contractId: contract.id,
            tenantName: tenant?.name,
            roomId: roomId,
            type: 'Electricity',
            amount: cost,
            dueDate: new Date().toISOString().split('T')[0], // Due immediately
            status: 'Pending',
            description: `${readingDate} Reading`,
            readingStart: oldReading,
            readingEnd: newReading,
            periodEnd: readingDate
        });
    }
};

export const getDashboardStats = (expiringDays: number = 60) => {
    const totalRooms = ROOMS.length;
    const occupied = ROOMS.filter(r => r.status === 'Occupied').length;
    const occupancyRate = (occupied / totalRooms) * 100;
    
    const currentMonthStr = new Date().toISOString().slice(0, 7); 
    const monthlyRevenue = TRANSACTIONS
        .filter(t => t.status === 'Paid' && (t.type === 'Rent' || t.type === 'MachineIncome') && t.paidDate?.startsWith(currentMonthStr))
        .reduce((sum, t) => sum + t.amount, 0);

    // Annual (Last 12 Months)
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    
    const annualRevenue = TRANSACTIONS
        .filter(t => t.status === 'Paid' && t.paidDate && new Date(t.paidDate) >= oneYearAgo)
        .reduce((sum, t) => sum + t.amount, 0);

    const annualExpenses = EXPENSES
        .filter(e => new Date(e.date) >= oneYearAgo)
        .reduce((sum, e) => sum + e.amount, 0);

    // Expiring Soon
    const expiringSoon = CONTRACTS.filter(c => {
        if (c.status !== ContractStatus.ACTIVE) return false;
        const end = new Date(c.endDate);
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays > 0 && diffDays <= expiringDays;
    }).length;

    const overdueCount = TRANSACTIONS.filter(t => t.status === 'Overdue').length;

    return {
        totalRooms,
        occupied,
        occupancyRate: occupancyRate.toFixed(1),
        monthlyRevenue,
        annualNetProfit: annualRevenue - annualExpenses,
        expiringSoon,
        overdueCount
    };
};

export const getTransactionsByRoom = (roomId: string) => {
    return TRANSACTIONS.filter(t => t.roomId === roomId).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
};

// --- Standard Property Logic ---

export const calculateProration = (rent: number, terminationDateStr: string, periodEndStr: string): number => {
    const termDate = new Date(terminationDateStr);
    const dailyRate = rent / 30;
    const dayOfMonth = termDate.getDate();
    return Math.round(dailyRate * dayOfMonth);
};

export const terminateContract = (contractId: string, date: string, reason: string): Contract[] => {
    const idx = CONTRACTS.findIndex(c => c.id === contractId);
    if (idx !== -1) {
        CONTRACTS[idx].status = ContractStatus.TERMINATED;
        CONTRACTS[idx].terminationDate = date;
        CONTRACTS[idx].terminationReason = reason;
        
        const roomIdx = ROOMS.findIndex(r => r.id === CONTRACTS[idx].roomId);
        if(roomIdx !== -1) ROOMS[roomIdx].status = 'Vacant';
    }
    return [...CONTRACTS];
};

export const createContract = (contract: Partial<Contract>): Contract => {
    const newContract: Contract = {
        id: `c${Date.now()}`,
        tenantId: contract.tenantId!,
        roomId: contract.roomId!,
        startDate: contract.startDate!,
        endDate: contract.endDate!,
        rentAmount: contract.rentAmount!,
        paymentFrequency: contract.paymentFrequency || PaymentFrequency.MONTHLY,
        depositAmount: contract.depositAmount!,
        depositStatus: contract.depositStatus || DepositStatus.UNPAID,
        itemsIssued: contract.itemsIssued || [],
        status: ContractStatus.ACTIVE
    };
    CONTRACTS.push(newContract);
    
    const roomIdx = ROOMS.findIndex(r => r.id === newContract.roomId);
    if(roomIdx !== -1) ROOMS[roomIdx].status = 'Occupied';
    
    return newContract;
};

export const updateContract = (id: string, updates: Partial<Contract>) => {
    const idx = CONTRACTS.findIndex(c => c.id === id);
    if (idx !== -1) {
        CONTRACTS[idx] = { ...CONTRACTS[idx], ...updates };
    }
};

export const createTenant = (tenant: Partial<Tenant>): Tenant => {
    const newTenant: Tenant = {
        id: `t${Date.now()}`,
        name: tenant.name!,
        phoneNumber: tenant.phoneNumber || '',
        idNumber: tenant.idNumber || '',
        homeAddress: tenant.homeAddress || '',
        birthday: tenant.birthday || '',
        ...tenant
    };
    TENANTS.push(newTenant);
    return newTenant;
};

export const updateTenant = (id: string, updates: Partial<Tenant>) => {
    const idx = TENANTS.findIndex(t => t.id === id);
    if (idx !== -1) {
        TENANTS[idx] = { ...TENANTS[idx], ...updates };
    }
};
