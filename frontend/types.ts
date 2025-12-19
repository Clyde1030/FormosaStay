
export enum PaymentFrequency {
    MONTHLY = 'Monthly',
    QUARTERLY = 'Quarterly',
    SEMIANNUALLY = 'Semiannually',
    YEARLY = 'Yearly'
}

export enum LeaseStatus {
    ACTIVE = 'active',
    TERMINATED = 'terminated',
    EXPIRED = 'expired'
}

// Added for component compatibility
export enum ContractStatus {
    ACTIVE = 'Active',
    TERMINATED = 'Terminated',
    EXPIRED = 'Expired'
}

// Added for component compatibility
export enum DepositStatus {
    PAID = 'Paid',
    UNPAID = 'Unpaid',
    PARTIAL = 'Partial'
}

export interface Building {
    id: number;
    building_no: number;
    address: string;
    name?: string; // Component uses b.name
    totalRooms?: number; // Component uses b.totalRooms
    created_at?: string;
}

export interface Room {
    id: any;
    building_id: number;
    buildingId?: number;
    floor_no: number;
    room_no: string;
    roomNumber: string; // Component uses roomNumber
    size_ping: number;
    sizePing?: number;
    status?: 'Occupied' | 'Vacant'; // Component uses status
    currentMeterReading: number; // Component uses currentMeterReading
    created_at?: string;
}

export interface Tenant {
    id: number;
    first_name: string;
    last_name: string;
    name?: string; // Component uses name
    gender: 'M' | 'F' | 'O';
    birthday: string;
    personal_id: string;
    idNumber?: string;
    phone: string;
    phoneNumber?: string;
    email?: string;
    line_id?: string;
    lineId?: string;
    address: string;
    homeAddress?: string;
    motorcyclePlate?: string;
    created_at?: string;
}

export interface Lease {
    id: number;
    tenant_id: number;
    room_id: any;
    start_date: string;
    end_date: string;
    early_termination_date?: string;
    monthly_rent: number;
    deposit: number;
    pay_rent_on: number;
    payment_term: string;
    status: LeaseStatus | any;
    created_at?: string;
}

// Added for component compatibility
export interface Contract extends Lease {
    rentAmount: number;
    startDate: string;
    endDate: string;
    depositAmount: number;
    depositStatus: DepositStatus;
    itemsIssued: string[];
    // Fix: Added paymentFrequency to Contract interface to match component expectations
    paymentFrequency: PaymentFrequency;
}

export interface TenantWithLease extends Tenant {
    active_lease?: Lease;
    room?: Room;
    building?: Building;
}

// Added for component compatibility
export interface TenantWithContract extends TenantWithLease {
    currentContract?: Contract;
}

// --- Finance Types ---

export type PaymentCategory = 'rent' | 'electricity' | 'penalty';
export type PaymentStatus = 'unpaid' | 'paid' | 'partial' | 'bad_debt';

export interface Payment {
    id: number;
    lease_id: number;
    category: PaymentCategory;
    period_start: string;
    period_end: string;
    due_amount: number;
    paid_amount: number;
    status: PaymentStatus;
    created_at?: string;
}

// Added for FinanceManager
export interface Transaction {
    id: string;
    roomId?: any;
    tenantName: string;
    contractId?: number;
    type: 'Rent' | 'Deposit' | 'Electricity' | 'Fee' | 'MachineIncome';
    amount: number;
    dueDate: string;
    status: 'Paid' | 'Overdue' | 'Unpaid' | string;
    paidDate?: string;
    method?: 'Transfer' | 'Cash' | 'LinePay' | string;
    note?: string;
    periodStart?: string;
    periodEnd?: string;
    readingStart?: number;
    readingEnd?: number;
    description?: string;
}

// Added for FinanceManager
export interface Expense {
    id: string;
    category: 'Maintenance' | 'Cleaning' | 'Utilities' | 'Payroll' | 'Tax' | 'Misc' | any;
    amount: number;
    description: string;
    attachmentName?: string;
    date: string;
}

export interface CashFlow {
    id: number;
    category_id: number;
    cash_account_id: number;
    lease_id?: number;
    building_id?: number;
    room_id?: number;
    flow_date: string;
    amount: number;
    payment_method: 'cash' | 'bank_transfer' | 'linepay' | 'other';
    note?: string;
}

export interface ElectricityRate {
    id: string | number;
    building_id?: number;
    roomId?: any;
    effectiveDate?: string;
    ratePerDegree?: number;
}

export interface MeterReading {
    id: number;
    room_id: number;
    read_date: string;
    read_amount: number;
}
