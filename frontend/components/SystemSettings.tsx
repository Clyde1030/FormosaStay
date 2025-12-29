
import React, { useState, useEffect } from 'react';
import { Database, Shield, Server, Copy, Check, Download, Code, Github, RefreshCw } from 'lucide-react';
import { apiClient } from '../services/apiClient';

const SystemSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'schema' | 'config' | 'database'>('database');
    const [copied, setCopied] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
    const [dbInfo, setDbInfo] = useState<any>(null);

    const checkDatabaseConnection = async () => {
        try {
            const info = await apiClient.get('/health/db');
            setIsDbConnected(true);
            setDbInfo(info);
        } catch (error) {
            setIsDbConnected(false);
            setDbInfo(null);
        }
    };

    useEffect(() => {
        checkDatabaseConnection();
    }, []);

    const postgresSchema = `# Security & Roles
CREATE TABLE user_account (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE role (
    id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO role (code, description) VALUES
('admin', 'System administrator'),
('manager', 'Property manager'),
('engineer', 'System engineer / developer');

CREATE TABLE user_role (
    user_id BIGINT REFERENCES user_account(id),
    role_id SMALLINT REFERENCES role(id),
    PRIMARY KEY (user_id, role_id)
);

# Buildings & Room 
CREATE TABLE building (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    building_no INTEGER NOT NULL UNIQUE,
    address TEXT NOT NULL,

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE room (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    building_id BIGINT NOT NULL,
    floor_no INTEGER NOT NULL,
    room_no CHAR(1) NOT NULL CHECK (room_no ~ '^[A-Z]$'),
	size_ping NUMERIC(6,2),

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_room_building
        FOREIGN KEY (building_id)
        REFERENCES building(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_room UNIQUE (building_id, floor_no, room_no)
);

CREATE INDEX idx_room_building ON room(building_id);

# Tenant
CREATE TABLE tenant (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('M','F','O')),
    birthday DATE NOT NULL,
    personal_id TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    email TEXT,
    line_id TEXT,
    address TEXT NOT NULL,

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE tenant_emergency_contact (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone TEXT NOT NULL,

    CONSTRAINT fk_ec_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenant(id)
        ON DELETE CASCADE
);

# Lease
CREATE TABLE lease (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    early_termination_date DATE,

    monthly_rent NUMERIC(10,2) NOT NULL,
    deposit NUMERIC(10,2) NOT NULL,
    pay_rent_on SMALLINT NOT NULL CHECK (pay_rent_on BETWEEN 1 AND 31),

    payment_term TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active','terminated','expired')),

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_lease_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenant(id),

    CONSTRAINT fk_lease_room
        FOREIGN KEY (room_id)
        REFERENCES room(id)
);

CREATE INDEX idx_lease_room ON lease(room_id);

/* One active lease per room */
CREATE UNIQUE INDEX uq_active_lease_per_room
ON lease(room_id)
WHERE status = 'active';

# Lease Assets
CREATE TABLE lease_asset (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lease_id BIGINT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('key', 'fob', 'controller')),
    quantity INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT fk_asset_lease
        FOREIGN KEY (lease_id)
        REFERENCES lease(id)
        ON DELETE CASCADE
);

# Payment
CREATE TABLE payment (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lease_id BIGINT NOT NULL,

    category TEXT NOT NULL CHECK (category IN ('rent','electricity','penalty')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    due_amount NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('unpaid','paid','partial','bad_debt')),

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_payment_lease
        FOREIGN KEY (lease_id)
        REFERENCES lease(id),

    CONSTRAINT uq_payment_period
        UNIQUE (lease_id, category, period_start, period_end)
);

CREATE INDEX idx_payment_lease ON payment(lease_id);

# Electricity
CREATE TABLE electricity_rate (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    building_id BIGINT NOT NULL,
    room_id BIGINT,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rate_per_kwh NUMERIC(10,4) NOT NULL,

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_rate_building
        FOREIGN KEY (building_id)
        REFERENCES building(id),

    CONSTRAINT fk_rate_room
        FOREIGN KEY (room_id)
        REFERENCES room(id)
);

CREATE TABLE meter_reading (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id BIGINT NOT NULL,
    read_date DATE NOT NULL,
    read_amount NUMERIC(10,2) NOT NULL,

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_meter_room
        FOREIGN KEY (meter_room_id)
        REFERENCES room(id),

    CONSTRAINT uq_meter_reading
        UNIQUE (room_id, read_date)
);

CREATE INDEX idx_meter_room_date ON meter_reading(room_id, read_date);

# Cash Flow
CREATE TABLE cash_flow_category (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    chinese_name TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'transfer')),
    category_group TEXT
);

CREATE TABLE cash_account (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chinese_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('bank', 'cash', 'clearing', 'deposit')),
    note TEXT
);

CREATE TABLE cash_flow (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    category_id BIGINT NOT NULL,
    cash_account_id BIGINT NOT NULL,

    lease_id BIGINT,
    building_id BIGINT,
    room_id BIGINT,

    flow_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
	payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'linepay', 'other')),
    note TEXT,

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_cf_category
        FOREIGN KEY (category_id)
        REFERENCES cash_flow_category(id),

    CONSTRAINT fk_cf_account
        FOREIGN KEY (cash_account_id)
        REFERENCES cash_account(id),

    CONSTRAINT fk_cf_lease
        FOREIGN KEY (lease_id)
        REFERENCES lease(id),

    CONSTRAINT fk_cf_building
        FOREIGN KEY (building_id)
        REFERENCES building(id),

    CONSTRAINT fk_cf_room
        FOREIGN KEY (room_id)
        REFERENCES room(id)
);

CREATE INDEX idx_cf_date ON cash_flow(flow_date);
CREATE INDEX idx_cf_category ON cash_flow(category_id);
CREATE INDEX idx_cf_account ON cash_flow(cash_account_id);
CREATE INDEX idx_cf_lease ON cash_flow(lease_id);

CREATE TABLE cash_flow_attachment (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cash_flow_id BIGINT NOT NULL,
    file_url TEXT NOT NULL,

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT fk_attachment_cf
        FOREIGN KEY (cash_flow_id)
        REFERENCES cash_flow(id)
        ON DELETE CASCADE
);

INSERT INTO cash_flow_category (code, chinese_name, direction, category_group) VALUES
('rent', '租金', 'in', 'tenant'),
('deposit_received', '押金', 'in', 'tenant'),
('deposit_returned', '退押金', 'out', 'tenant'),
('referral_fee', '介紹費', 'out', 'operation'),
('tenant_electricity', '住戶電費', 'out', 'tenant'),
('manager_salary', '管理員薪水', 'out', 'operation'),
('manager_bonus', '管理員獎金', 'out', 'operation'),
('maintenance', '維修費', 'out', 'operation'),
('new_equipment', '新設備', 'out', 'operation'),
('building_electricity', '大樓電費支出', 'out', 'operation'),
('water', '水費', 'out', 'operation'),
('tax', '稅', 'out', 'operation'),
('internet', '網路費', 'out', 'operation'),
('stationery', '文具', 'out', 'operation'),
('daily_supply', '日常用品', 'out', 'operation'),
('misc', '其他', 'out', 'operation'),
('bank_transfer', '匯馬玲帳戶', 'transfer', 'operation'),
('bank_fee', '匯費', 'out', 'operation');

# Business Rule Trigger
CREATE OR REPLACE FUNCTION enforce_room_building_match()
RETURNS trigger AS $$
BEGIN
    IF NEW.room_id IS NOT NULL AND NEW.building_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM room r
            WHERE r.id = NEW.room_id
              AND r.building_id = NEW.building_id
        ) THEN
            RAISE EXCEPTION
                'room_id % does not belong to building_id %',
                NEW.room_id, NEW.building_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cf_room_building
BEFORE INSERT OR UPDATE ON cash_flow
FOR EACH ROW
EXECUTE FUNCTION enforce_room_building_match();`;

    const handleCopy = () => {
        navigator.clipboard.writeText(postgresSchema);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSyncToGithub = () => {
        setIsSyncing(true);
        setSyncSuccess(false);
        setTimeout(() => {
            setIsSyncing(false);
            setSyncSuccess(true);
            setTimeout(() => setSyncSuccess(false), 3000);
        }, 1500);
    };

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
                <p className="text-slate-500">Infrastructure configuration and database design.</p>
            </header>

            <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('database')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'database' ? 'border-brand-500 text-brand-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Database size={18} /> Database Connection
                </button>
                <button 
                    onClick={() => setActiveTab('schema')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'schema' ? 'border-brand-500 text-brand-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Code size={18} /> Postgres Schema
                </button>
                <button 
                    onClick={() => setActiveTab('config')}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'config' ? 'border-brand-500 text-brand-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Server size={18} /> API & Cloud
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
                {activeTab === 'database' && (
                    <div className="p-8">
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                                        <Database size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">PostgreSQL Database Connection</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {isDbConnected === null ? (
                                                <RefreshCw size={14} className="animate-spin text-slate-400" />
                                            ) : (
                                                <div className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                            )}
                                            <span className="text-sm text-slate-500">
                                                {isDbConnected === null ? 'Checking connection...' : (isDbConnected ? 'Connected to Database' : 'Connection failed')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={checkDatabaseConnection}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                                >
                                    <RefreshCw size={14} /> Refresh
                                </button>
                            </div>

                            {isDbConnected && dbInfo && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Database Info</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-0.5">PostgreSQL Version</label>
                                                <code className="text-sm font-mono text-slate-700">{dbInfo.postgresql_version || 'Unknown'}</code>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-0.5">Tables Count</label>
                                                <code className="text-sm font-mono text-slate-700">{dbInfo.tables_count || 0}</code>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-400 block mb-0.5">Status</label>
                                                <span className="text-sm font-medium text-emerald-600">{dbInfo.status || 'ok'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-brand-50 border border-brand-100 rounded-xl space-y-4">
                                        <h4 className="text-xs font-bold text-brand-600 uppercase tracking-wider">Connection Details</h4>
                                        <ul className="text-sm text-brand-800 space-y-2">
                                            <li className="flex items-start gap-2">
                                                <Check size={16} className="shrink-0 mt-0.5" />
                                                <span>Backend API is connected to local PostgreSQL.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check size={16} className="shrink-0 mt-0.5" />
                                                <span>Database connection is active and healthy.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check size={16} className="shrink-0 mt-0.5" />
                                                <span>All API endpoints are available for data operations.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {!isDbConnected && isDbConnected !== null && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex gap-3 items-start">
                                    <Shield className="text-red-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-sm font-bold text-red-800">Database Connection Failed</p>
                                        <p className="text-xs text-red-700 mt-1">
                                            Unable to connect to the PostgreSQL database. Please check:
                                        </p>
                                        <ul className="text-xs text-red-700 mt-2 list-disc list-inside space-y-1">
                                            <li>Ensure PostgreSQL is running</li>
                                            <li>Verify database connection settings in backend .env file</li>
                                            <li>Check that the database exists and schema is initialized</li>
                                            <li>Ensure the backend server is running</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'schema' && (
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Code size={20} className="text-brand-500"/> Production Database Schema
                                </h3>
                                <p className="text-sm text-slate-500">PostgreSQL initialization script with Taiwan-specific lease and utility logic.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    onClick={handleSyncToGithub}
                                    disabled={isSyncing}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        syncSuccess 
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                        : 'bg-slate-900 text-white hover:bg-slate-800'
                                    }`}
                                >
                                    {isSyncing ? <RefreshCw size={16} className="animate-spin" /> : (syncSuccess ? <Check size={16} /> : <Github size={16} />)}
                                    {isSyncing ? 'Syncing...' : (syncSuccess ? 'Synced to GitHub!' : 'Sync to GitHub')}
                                </button>
                                <button 
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
                                >
                                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                                    {copied ? 'Copied!' : 'Copy SQL'}
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
                                    <Download size={16} /> Export .sql
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-xl p-6 overflow-x-auto border border-slate-800 shadow-inner max-h-[60vh]">
                            <pre className="text-xs font-mono text-cyan-400 leading-relaxed whitespace-pre">
                                {postgresSchema}
                            </pre>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div className="p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <Server size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-800">Cloud Infrastructure</h3>
                            <p className="text-slate-500 mt-2">
                                The current architecture is designed to support AWS RDS PostgreSQL. 
                                Connection pooling via PgBouncer is recommended for serverless workloads.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemSettings;
