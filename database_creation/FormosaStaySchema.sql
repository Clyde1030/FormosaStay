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
    user_id BIGINT REFERENCES user_account(id) ON DELETE CASCADE,
    role_id SMALLINT REFERENCES role(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);



-- Buildings & Room 
CREATE TABLE building (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    building_no INTEGER NOT NULL UNIQUE,
    address TEXT NOT NULL,
    deleted_at TIMESTAMPTZ, 
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
    is_rentable BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
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
    deleted_at TIMESTAMPTZ,
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
CREATE TYPE lease_status AS ENUM ('active','terminated','expired');
CREATE TABLE lease (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES room(id),

    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    early_termination_date DATE CHECK (
        early_termination_date IS NULL
        OR early_termination_date BETWEEN start_date AND end_date
        ),

    monthly_rent NUMERIC(10,2) NOT NULL CHECK (monthly_rent >= 0),
    deposit NUMERIC(10,2) NOT NULL CHECK (deposit >= 0),
    pay_rent_on SMALLINT NOT NULL CHECK (pay_rent_on BETWEEN 1 AND 31),

    payment_term TEXT NOT NULL,
    status lease_status NOT NULL,
    vehicle_plate TEXT,

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_lease_room
        FOREIGN KEY (room_id)
        REFERENCES room(id)
);

CREATE INDEX idx_lease_room ON lease(room_id);

/* One active lease per room */
CREATE UNIQUE INDEX uq_active_lease_per_room
ON lease(room_id)
WHERE status = 'active' AND deleted_at IS NULL;


CREATE TABLE lease_tenant (
    lease_id BIGINT NOT NULL REFERENCES lease(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenant(id) ON DELETE RESTRICT,
    tenant_role TEXT NOT NULL CHECK (tenant_role IN ('primary','co_tenant')),
    joined_at DATE DEFAULT CURRENT_DATE,
    PRIMARY KEY (lease_id, tenant_id)
);

CREATE UNIQUE INDEX uq_primary_tenant
ON lease_tenant(lease_id)
WHERE tenant_role = 'primary';

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


-- Invoice: only track tenant's rent, electricity, penalty, and deposit
CREATE TABLE invoice (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lease_id BIGINT NOT NULL,

    category TEXT NOT NULL CHECK (category IN ('rent','electricity', 'penalty', 'deposit')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    due_date DATE NOT NULL,
    due_amount NUMERIC(10,2) NOT NULL CHECK (due_amount >= 0),
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('unpaid','paid','partial','bad_debt','returned','canceled')),

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT fk_payment_lease
        FOREIGN KEY (lease_id)
        REFERENCES lease(id),

    CONSTRAINT uq_payment_period
        UNIQUE (lease_id, category, period_start, period_end)
        DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX idx_invoice_lease ON invoice(lease_id);
CREATE UNIQUE INDEX uq_invoice_period_active
ON invoice(lease_id, category, period_start, period_end)
WHERE deleted_at IS NULL;




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
    invoice_id BIGINT REFERENCES invoice(id),
    flow_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
	payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'linepay', 'other')),
    note TEXT,

    created_by BIGINT REFERENCES user_account(id),
    updated_by BIGINT REFERENCES user_account(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

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
        REFERENCES room(id),

    -- If room_id is set, building_id must be set
    CONSTRAINT check_cf_room_requires_building
        CHECK(
            (room_id IS NULL AND building_id IS NULL) OR
            (room_id IS NOT NULL AND building_id IS NOT NULL)
        )
    
    
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

CREATE OR REPLACE FUNCTION enforce_lease_room_building_match()
RETURNS trigger AS $$
BEGIN
    IF NEW.lease_id IS NOT NULL THEN
        -- Validate lease <-> room
        IF NEW.room_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM lease l
            WHERE l.id = NEW.lease_id AND l.room_id = NEW.room_id
        ) THEN
            RAISE EXCEPTION
                'lease_id % does not belong to room_id %',
                NEW.lease_id, NEW.room_id;
        END IF;

        -- Validate lease <-> building
        IF NEW.building_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 
            FROM lease l
            JOIN room r ON r.id = l.room_id
            WHERE l.id = NEW.lease_id AND r.building_id = NEW.building_id
        ) THEN
            RAISE EXCEPTION
                'lease_id % does not belong to building_id %',
                NEW.lease_id, NEW.building_id;
        END IF;
    END IF;
    RETURN NEW;
END ;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_deleted_parent()
RETURNS trigger AS $$
BEGIN
    IF TG_TABLE_NAME = 'invoice' THEN
        IF EXISTS (
            SELECT 1 FROM lease
            WHERE id = NEW.lease_id
              AND deleted_at IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'Cannot create invoice for deleted lease %', NEW.lease_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_cf_room_building
BEFORE INSERT OR UPDATE ON cash_flow
FOR EACH ROW
EXECUTE FUNCTION enforce_room_building_match();

CREATE TRIGGER trg_cf_lease_room_building
BEFORE INSERT OR UPDATE ON cash_flow
FOR EACH ROW
EXECUTE FUNCTION enforce_lease_room_building_match();

CREATE TRIGGER trg_invoice_no_deleted_lease
BEFORE INSERT OR UPDATE ON invoice
FOR EACH ROW
EXECUTE FUNCTION prevent_deleted_parent();


CREATE OR REPLACE FUNCTION soft_delete(
    p_table TEXT,
    p_id BIGINT
) RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET deleted_at = now() WHERE id = $1',
        p_table
    ) USING p_id;
END;
$$ LANGUAGE plpgsql;
