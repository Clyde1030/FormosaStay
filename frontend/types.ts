
// Payment frequency - using English values to match database enum
export enum PaymentFrequency {
    MONTHLY = 'monthly',
    QUARTERLY = 'seasonal',  // Note: backend uses 'seasonal' for quarterly
    SEMIANNUALLY = 'semi-annual',
    YEARLY = 'annual'
}

// Display labels for payment frequency (Chinese for UI)
export const PaymentFrequencyLabels: Record<PaymentFrequency, string> = {
    [PaymentFrequency.MONTHLY]: '月繳',
    [PaymentFrequency.QUARTERLY]: '季繳',
    [PaymentFrequency.SEMIANNUALLY]: '半年繳',
    [PaymentFrequency.YEARLY]: '年繳'
}

// Lease asset types - using English values to match database
export enum LeaseAssetType {
    KEY = 'key',
    FOB = 'fob',
    CONTROLLER = 'controller'
}

// Display labels for lease asset types (Chinese for UI)
export const LeaseAssetTypeLabels: Record<LeaseAssetType, string> = {
    [LeaseAssetType.KEY]: '鑰匙',
    [LeaseAssetType.FOB]: '磁扣',
    [LeaseAssetType.CONTROLLER]: '遙控器'
}

// Lease status - using English values to match database
export enum LeaseStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    TERMINATED = 'terminated',
    EXPIRED = 'expired'
}

// Added for component compatibility - display labels
export enum ContractStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    ACTIVE = 'active',
    TERMINATED = 'terminated',
    EXPIRED = 'expired'
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
    emergency_contacts?: EmergencyContact[];
    created_at?: string;
}

export interface Lease {
    id: number;
    tenant_id: number;
    room_id: any;
    start_date: string;
    end_date: string;
    terminated_at?: string;
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
    submitted_at?: string | null; // ISO timestamp when lease was submitted
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

// Invoice category - using English values to match database
export type InvoiceCategory = 'rent' | 'electricity' | 'penalty' | 'deposit';
// Invoice status - using English values to match database
export type InvoiceStatus = 'overdue' | 'paid' | 'partial' | 'uncollectable' | 'returned' | 'canceled';

export interface Invoice {
    id: number;
    lease_id: number;
    category: InvoiceCategory;
    period_start: string;
    period_end: string;
    due_amount: number;
    paid_amount: number;
    status: InvoiceStatus;
    created_at?: string;
}

// Deprecated: Use Invoice instead
export type PaymentCategory = InvoiceCategory;
export type PaymentStatus = InvoiceStatus;
export interface Payment extends Invoice {}

// Added for FinanceManager
export interface Transaction {
    id: string;
    roomId?: any;
    tenantName: string;
    contractId?: number;
    type: 'Rent' | 'Deposit' | 'Electricity' | 'Fee' | 'MachineIncome';
    amount: number;
    dueDate: string;
    status: 'Paid' | 'Overdue' | string;
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
    category: string; // Category name from cash_flow_category table
    amount: number;
    description: string;
    attachmentName?: string;
    date: string;
    cash_account_id?: number;
    building_id?: number;
    room_id?: number;
    payment_method?: 'cash' | 'bank' | 'LINE_Pay' | 'other';
}

export interface CashAccount {
    id: number;
    chinese_name: string;
    account_type: 'cash' | 'bank' | 'clearing' | 'deposit';
    note?: string;
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
    payment_method: 'cash' | 'bank' | 'LINE_Pay' | 'other';
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

export interface CashFlowCategory {
    id: number;
    code: string;
    chinese_name: string;
    direction: 'in' | 'out' | 'transfer';
    category_group?: string;
}
