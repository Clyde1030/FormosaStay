export enum PaymentFrequency {
    MONTHLY = 'Monthly',
    QUARTERLY = 'Quarterly',
    SEMIANNUALLY = 'Semiannually',
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
    currentMeterReading: number; // Last recorded electricity reading
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

// --- Finance Types ---

export type TransactionType = 'Rent' | 'Electricity' | 'Deposit' | 'Fee' | 'MachineIncome';
export type PaymentMethod = 'Cash' | 'Transfer' | 'LinePay';
export type TransactionStatus = 'Paid' | 'Pending' | 'Overdue';

export interface Transaction {
    id: string;
    contractId?: string; // Optional if it's machine income
    tenantName?: string; // Denormalized for display
    roomId?: string;
    type: TransactionType;
    amount: number;
    dueDate: string;
    paidDate?: string;
    status: TransactionStatus;
    method?: PaymentMethod;
    description?: string;
    note?: string; // Admin note
    periodStart?: string;
    periodEnd?: string;
    readingStart?: number; // For Electricity
    readingEnd?: number; // For Electricity
}

export interface Expense {
    id: string;
    category: 'Maintenance' | 'Payroll' | 'Tax' | 'Cleaning' | 'Utilities' | 'Misc';
    amount: number;
    date: string;
    description: string;
    attachmentName?: string; // Simulate filename
}

export interface MeterReading {
    id: string;
    roomId: string;
    date: string;
    reading: number;
    billed: boolean;
}

export interface ElectricityRate {
    id: string;
    effectiveDate: string;
    ratePerDegree: number;
    roomId?: string; // If undefined, applies globally
}
