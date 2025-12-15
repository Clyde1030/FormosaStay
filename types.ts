export enum PaymentFrequency {
    MONTHLY = 'Monthly',
    QUARTERLY = 'Quarterly',
    YEARLY = 'Yearly'
}

export enum ContractStatus {
    ACTIVE = 'Active',
    UPCOMING = 'Upcoming',
    TERMINATED = 'Terminated',
    EXPIRED = 'Expired'
}

export enum DepositStatus {
    PAID = 'Paid',
    UNPAID = 'Unpaid',
    PARTIAL = 'Partial',
    REFUNDED = 'Refunded'
}

export interface Building {
    id: string;
    name: string;
    address: string;
    totalRooms: number;
}

export interface Room {
    id: string;
    buildingId: string;
    roomNumber: string;
    floor: number;
    baseRent: number;
    sizePing: number; // Size in Ping (Taiwan unit)
    status: 'Occupied' | 'Vacant' | 'Maintenance';
}

export interface Tenant {
    id: string;
    name: string;
    phoneNumber: string;
    lineId?: string; // Critical for Taiwan
    idNumber: string; // TW ID or ARC
    email?: string;
    homeAddress: string;
    birthday: string;
    motorcyclePlate?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    notes?: string;
    avatarUrl?: string;
}

export interface Contract {
    id: string;
    tenantId: string;
    roomId: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    paymentFrequency: PaymentFrequency;
    depositAmount: number;
    depositStatus: DepositStatus;
    itemsIssued: string[]; // e.g. ["Key", "Fob", "AC Remote"]
    status: ContractStatus;
    terminationDate?: string; // If ended early
    terminationReason?: string;
}

// Composite type for UI display
export interface TenantWithContract extends Tenant {
    currentContract?: Contract;
    room?: Room;
    building?: Building;
}