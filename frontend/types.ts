
// Payment frequency - using Chinese values to match database
export enum PaymentFrequency {
    MONTHLY = '月繳',
    QUARTERLY = '季繳',
    SEMIANNUALLY = '半年繳',
    YEARLY = '年繳'
}

// Lease status - using Chinese values to match database
export enum LeaseStatus {
    ACTIVE = '有效',
    TERMINATED = '終止',
    EXPIRED = '到期'
}

// Added for component compatibility - display labels
export enum ContractStatus {
    ACTIVE = '有效',
    TERMINATED = '終止',
    EXPIRED = '到期'
}

// Added for component compatibility - display labels
export enum DepositStatus {
    PAID = '已交',
    UNPAID = '未交',
    PARTIAL = '部分未交'
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

export interface EmergencyContact {
    id?: number;
    first_name: string;
    last_name: string;
    relationship: string;
    phone: string;
}

export interface Tenant {
    id: number;
    first_name: string;
    last_name: string;
    name?: string; // Component uses name
    gender: '男' | '女' | '其他';
    birthday: string;
    personal_id: string;
    idNumber?: string;
    phone: string;
    phoneNumber?: string;
    email?: string;
    line_id?: string;
    lineId?: string;
    address: string;
    motorcyclePlate?: string;
    emergency_contacts?: EmergencyContact[];
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
    vehicle_plate?: string;
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

// Payment category - using Chinese values to match database
export type PaymentCategory = '房租' | '電費' | '罰款' | '押金';
// Payment status - using Chinese values to match database
export type PaymentStatus = '未交' | '已交' | '部分未交' | '呆帳' | '歸還' | '取消';

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
    payment_method: '現金' | '銀行轉帳' | 'LINE Pay' | '其他';
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
