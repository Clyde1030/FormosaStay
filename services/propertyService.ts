import { Building, Room, Tenant, Contract, PaymentFrequency, ContractStatus, DepositStatus, TenantWithContract } from '../types';

// --- Mock Data ---

const BUILDINGS: Building[] = [
    { id: 'b1', name: 'Xinyi Heights', address: 'No. 123, Xinyi Rd, Taipei', totalRooms: 15 },
    { id: 'b2', name: 'Da\'an Scholar House', address: 'No. 45, Heping E Rd, Taipei', totalRooms: 20 },
    { id: 'b3', name: 'Zhongshan Lofts', address: 'No. 88, Linsen N Rd, Taipei', totalRooms: 12 },
    { id: 'b4', name: 'Neihu Tech Dorm', address: 'No. 10, Ruiguang Rd, Taipei', totalRooms: 13 },
];

const ROOMS: Room[] = [];
// Generate 60 rooms across buildings
let roomCounter = 1;
BUILDINGS.forEach(b => {
    for (let i = 1; i <= b.totalRooms; i++) {
        ROOMS.push({
            id: `r${roomCounter}`,
            buildingId: b.id,
            roomNumber: `${Math.floor(i/5) + 2}0${i%5 === 0 ? 5 : i%5}`, // Fake room numbers like 201, 202...
            floor: Math.floor(i/5) + 2,
            baseRent: 12000 + (Math.floor(Math.random() * 5) * 1000), // 12000 - 16000 NTD
            sizePing: 8 + Math.floor(Math.random() * 4),
            status: Math.random() > 0.3 ? 'Occupied' : 'Vacant'
        });
        roomCounter++;
    }
});

// Mock Tenants
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

// Mock Contracts
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

// --- Service Logic ---

export const getBuildings = () => BUILDINGS;
export const getRooms = () => ROOMS;
export const getTenants = () => TENANTS;
export const getContracts = () => CONTRACTS;

// Join data for UI
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

export const getDashboardStats = () => {
    const totalRooms = ROOMS.length;
    const occupied = ROOMS.filter(r => r.status === 'Occupied').length;
    const occupancyRate = (occupied / totalRooms) * 100;
    
    // Simple revenue calc
    const monthlyRevenue = CONTRACTS
        .filter(c => c.status === ContractStatus.ACTIVE)
        .reduce((sum, c) => sum + c.rentAmount, 0);

    return {
        totalRooms,
        occupied,
        occupancyRate: occupancyRate.toFixed(1),
        monthlyRevenue,
        expiringSoon: CONTRACTS.filter(c => {
            if (c.status !== ContractStatus.ACTIVE) return false;
            const end = new Date(c.endDate);
            const today = new Date();
            const diffTime = Math.abs(end.getTime() - today.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            return diffDays <= 60; // Expiring in 60 days
        }).length
    };
};

// Contract Lifecycle Logic

export const calculateProration = (rent: number, terminationDateStr: string, periodEndStr: string): number => {
    const termDate = new Date(terminationDateStr);
    // Assume simplistic proration: Rent is calculated daily
    const dailyRate = rent / 30;
    // In a real app, logic depends on if they prepaid the month/quarter.
    // This function calculates how much refund is due if they leave mid-cycle, 
    // or how much is owed for partial month.
    // For this prototype, we return the Cost for the partial month.
    
    const dayOfMonth = termDate.getDate();
    return Math.round(dailyRate * dayOfMonth);
};

export const terminateContract = (contractId: string, date: string, reason: string): Contract[] => {
    // In a real app, this updates DB. Here we update local array copy for simulation.
    const idx = CONTRACTS.findIndex(c => c.id === contractId);
    if (idx !== -1) {
        CONTRACTS[idx].status = ContractStatus.TERMINATED;
        CONTRACTS[idx].terminationDate = date;
        CONTRACTS[idx].terminationReason = reason;
        
        // Free up the room
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
    
    // Occupy room
    const roomIdx = ROOMS.findIndex(r => r.id === newContract.roomId);
    if(roomIdx !== -1) ROOMS[roomIdx].status = 'Occupied';
    
    return newContract;
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
