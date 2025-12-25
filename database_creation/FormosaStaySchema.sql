-- Security & Roles
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



-- Buildings & Room 
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



-- Tenant
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



-- Lease
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
    vehicle_plate TEXT,

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



-- Lease Assets
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



-- Payment
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



-- Electricity
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
        FOREIGN KEY (room_id)
        REFERENCES room(id),

    CONSTRAINT uq_meter_reading
        UNIQUE (room_id, read_date)
);

CREATE INDEX idx_meter_room_date ON meter_reading(room_id, read_date);



-- Cash Flow
CREATE TABLE cash_flow_category (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'transfer')),
    description TEXT
);

CREATE TABLE cash_account (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('cash', 'bank', 'third_party')),
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

INSERT INTO cash_flow_category (code, name, direction) VALUES
('rent', '租金', 'in'),
('deposit_received', '押金', 'in'),
('deposit_returned', '退押金', 'out'),
('referral_fee', '介紹費', 'out'),
('tenant_electricity', '住戶電費', 'in'),
('manager_salary', '管理員薪水', 'out'),
('manager_bonus', '管理員獎金', 'out'),
('maintenance', '維修費', 'out'),
('new_equipment', '新設備', 'out'),
('building_electricity', '大樓電費支出', 'out'),
('water', '水費', 'out'),
('tax', '稅', 'out'),
('internet', '網路費', 'out'),
('stationery', '文具', 'out'),
('daily_supply', '日常用品', 'out'),
('misc', '其他', 'out'),
('bank_transfer', '匯馬玲帳戶', 'transfer'),
('bank_fee', '匯費', 'out');



-- Business Rule Trigger
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
EXECUTE FUNCTION enforce_room_building_match();


