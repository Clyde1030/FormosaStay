-- ============================================================
-- FormosaStay Schema (Clean Version)
-- ============================================================
-- PostgreSQL 16
-- Reference DDL for Alembic migrations & SQLAlchemy models
--
-- Core principles:
-- - Lease defines LEGAL terms
-- - Lease amendments define LEGAL changes only
-- - Invoice defines BILLING
-- - Discounts live at INVOICE level
-- - Adjustments are penalties / corrections
-- - Cash flow reflects actual money movement
-- ============================================================

-- ############################################################
-- ### ENUM Types ###
-- ############################################################

CREATE TYPE gender_type AS ENUM ('M','F','O');

-- How rent is contractually billed
CREATE TYPE payment_term_type AS ENUM ('annual','semi-annual','seasonal','monthly');

-- ONLY legal contract changes
CREATE TYPE lease_amendment_type AS ENUM ('rent_change','other');

-- Discount classification (billing only)
CREATE TYPE discount_type AS ENUM (
    'first_month_free',
    'free_months',
    'fixed_amount',
    'percentage'
);

CREATE TYPE tenant_role_type AS ENUM ('primary','secondary');

CREATE TYPE payment_status AS ENUM ('unmatured','overdue','paid','partial','uncollectable','returned','canceled');

CREATE TYPE invoice_category AS ENUM ('rent','electricity', 'penalty', 'deposit');

CREATE TYPE adjustment_source_type AS ENUM ('manual','penalty');

CREATE TYPE cash_direction_type AS ENUM ('in','out','transfer');

CREATE TYPE cash_account_type AS ENUM ('bank', 'cash', 'clearing', 'deposit');

CREATE TYPE payment_method_type AS ENUM ('cash','bank','LINE_Pay','other');

 

-- ############################################################
-- ### Security & Roles ###
-- ############################################################


CREATE TABLE user_account (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    email TEXT NOT NULL,
    user_password TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_user_account PRIMARY KEY (id),
    CONSTRAINT uq_user_account_email UNIQUE (email)
);

CREATE TABLE role (
    id SMALLINT GENERATED ALWAYS AS IDENTITY,
    code TEXT NOT NULL,
    description TEXT,

    CONSTRAINT pk_role PRIMARY KEY (id),
    CONSTRAINT uq_role_code UNIQUE (code)
);

CREATE TABLE user_role (
    user_id BIGINT NOT NULL,
    role_id SMALLINT NOT NULL,

    CONSTRAINT pk_user_role PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_role_user
        FOREIGN KEY (user_id) REFERENCES user_account(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_role_role
        FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE
);

CREATE TABLE employee (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role_id SMALLINT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,

    CONSTRAINT pk_employee PRIMARY KEY (id),
    CONSTRAINT uq_employee UNIQUE (email),
    CONSTRAINT fk_employee_role
        FOREIGN KEY (role_id) REFERENCES role(id)
);


-- Buildings & Room 
CREATE TABLE building (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    building_no INTEGER NOT NULL,
    address TEXT NOT NULL,
    landlord_name TEXT,
    landlord_address TEXT,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT pk_building PRIMARY KEY (id),
    CONSTRAINT uq_building_no UNIQUE (building_no),
    CONSTRAINT fk_building_created_by
        FOREIGN KEY (created_by) REFERENCES user_account(id),
    CONSTRAINT fk_building_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_account(id)
);

CREATE TABLE room (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    building_id BIGINT NOT NULL,
    floor_no INTEGER NOT NULL,
    room_no CHAR(1) NOT NULL,
    size_ping NUMERIC(6,2),
    is_rentable BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT pk_room PRIMARY KEY (id),
    CONSTRAINT uq_room UNIQUE (building_id, floor_no, room_no),
    CONSTRAINT fk_room_building
        FOREIGN KEY (building_id) REFERENCES building(id) ON DELETE RESTRICT,
    CONSTRAINT fk_room_created_by
        FOREIGN KEY (created_by) REFERENCES user_account(id),
    CONSTRAINT fk_room_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_account(id),
    CONSTRAINT chk_room_no_format CHECK (room_no ~ '^[A-Z]$')
);



-- Tenant
CREATE TABLE tenant (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender gender_type NOT NULL,
    birthday DATE NOT NULL,
    personal_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    line_id TEXT,
    home_address TEXT NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT pk_tenant PRIMARY KEY (id),
    CONSTRAINT uq_tenant_personal_id UNIQUE (personal_id),
    CONSTRAINT fk_tenant_created_by
        FOREIGN KEY (created_by) REFERENCES user_account(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tenant_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_account(id) ON DELETE RESTRICT
);

CREATE TABLE tenant_emergency_contact (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    tenant_id BIGINT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone TEXT NOT NULL,

    CONSTRAINT pk_tenant_emergency_contact PRIMARY KEY (id),
    CONSTRAINT fk_ec_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);



-- Lease
CREATE TABLE lease (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    room_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    terminated_at DATE,
    termination_reason TEXT,
    submitted_at TIMESTAMPTZ,
    monthly_rent NUMERIC(10,2) NOT NULL,
    deposit NUMERIC(10,2) NOT NULL,
    pay_rent_on SMALLINT NOT NULL,
    payment_term payment_term_type NOT NULL,
    assets JSONB,
    vehicle_plate TEXT,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT pk_lease PRIMARY KEY (id),
    CONSTRAINT fk_lease_room
        FOREIGN KEY (room_id) REFERENCES room(id),
    CONSTRAINT chk_lease_dates CHECK (end_date > start_date),
    CONSTRAINT chk_termination
        CHECK (
            terminated_at IS NULL
            OR terminated_at BETWEEN start_date AND end_date
        ),
    CONSTRAINT chk_monthly_rent CHECK (monthly_rent >= 0),
    CONSTRAINT chk_deposit CHECK (deposit >= 0),
    CONSTRAINT chk_pay_rent_on CHECK (pay_rent_on BETWEEN 1 AND 31),
    CONSTRAINT fk_lease_created_by
        FOREIGN KEY (created_by) REFERENCES user_account(id),
    CONSTRAINT fk_lease_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_account(id)    
);


-- ############################################################
-- ### Lease Amendment ###
-- ############################################################
-- Lease to lease_amendment is one-to-many relationship
-- Tracks LEGAL changes only but does NOT modify lease values directly
-- Does NOT affect billing or invoices directly.
CREATE TABLE lease_amendment (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    lease_id BIGINT NOT NULL,
    amendment_type lease_amendment_type NOT NULL,
    effective_date DATE NOT NULL,

    -- Only for rent_change
    old_monthly_rent NUMERIC(10,2),
    new_monthly_rent NUMERIC(10,2),

    reason TEXT NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT pk_lease_amendment PRIMARY KEY (id),

    CONSTRAINT fk_lease_amendment_lease
        FOREIGN KEY (lease_id) REFERENCES lease(id),

    CONSTRAINT fk_lease_amendment_created_by
        FOREIGN KEY (created_by) REFERENCES user_account(id),

    -- Rent change amendments must have both values
    CONSTRAINT chk_rent_change_values
        CHECK (
            amendment_type <> 'rent_change'
            OR (
                old_monthly_rent IS NOT NULL
                AND new_monthly_rent IS NOT NULL
                AND old_monthly_rent >= 0
                AND new_monthly_rent >= 0
            )
        )
);

CREATE TABLE lease_tenant (
    lease_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    tenant_role tenant_role_type NOT NULL,
    joined_at DATE DEFAULT CURRENT_DATE,

    CONSTRAINT pk_lease_tenant PRIMARY KEY (lease_id, tenant_id),
    CONSTRAINT fk_lt_lease
        FOREIGN KEY (lease_id) REFERENCES lease(id) ON DELETE CASCADE,
    CONSTRAINT fk_lt_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE RESTRICT
);



-- Invoice: only track tenant's rent, electricity, penalty, and deposit
-- and reflect final payable amounts
CREATE TABLE invoice (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    lease_id BIGINT NOT NULL,
    category invoice_category NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_amount NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status payment_status NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    CONSTRAINT pk_invoice PRIMARY KEY (id),
    CONSTRAINT fk_invoice_lease
        FOREIGN KEY (lease_id) REFERENCES lease(id) ON DELETE RESTRICT,
    CONSTRAINT chk_invoice_due_amount CHECK (due_amount >= 0),
    CONSTRAINT chk_invoice_paid_amount CHECK (paid_amount >= 0),
    CONSTRAINT uq_invoice_period
        UNIQUE (lease_id, category, period_start, period_end)
        DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT fk_invoice_created_by
        FOREIGN KEY (created_by) REFERENCES user_account(id),
    CONSTRAINT fk_invoice_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_account(id)
);

-- ############################################################
-- ### Invoice Discount ###
-- ############################################################
-- Discounts are BILLING INCENTIVES.
-- Never modify lease or invoice due_amount.

CREATE TABLE invoice_discount (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    invoice_id BIGINT NOT NULL,
    discount_type discount_type NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    reason TEXT,
    source TEXT,
    created_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT pk_invoice_discount PRIMARY KEY (id),
    CONSTRAINT fk_discount_invoice
        FOREIGN KEY (invoice_id) REFERENCES invoice(id) ON DELETE CASCADE,
    CONSTRAINT chk_discount_amount_positive
        CHECK (amount > 0)
);


-- Invoice to Invoice Adjustment is one-to-many relationship
-- Consider labeling each adjustment for each invoice with numbers starting from 1
-- adjustment_no
CREATE TABLE invoice_adjustment (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    invoice_id BIGINT NOT NULL,
    source_type adjustment_source_type NOT NULL,
    source_id BIGINT,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_invoice_adjustment PRIMARY KEY (id),
    CONSTRAINT fk_adj_invoice
        FOREIGN KEY (invoice_id) REFERENCES invoice(id) ON DELETE CASCADE
);



-- Electricity
CREATE TABLE electricity_rate (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    room_id BIGINT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rate_per_kwh NUMERIC(10,4) NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT pk_electricity_rate PRIMARY KEY (id),
    CONSTRAINT fk_rate_room
        FOREIGN KEY (room_id) REFERENCES room(id),
    CONSTRAINT fk_rate_created_by
        FOREIGN KEY (created_by) REFERENCES user_account(id),
    CONSTRAINT fk_rate_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_account(id)
);

CREATE TABLE meter_reading (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    room_id BIGINT NOT NULL,
    read_date DATE NOT NULL,
    read_amount NUMERIC(10,2) NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT pk_meter_reading PRIMARY KEY (id),
    CONSTRAINT fk_meter_room
        FOREIGN KEY (room_id) REFERENCES room(id),
    CONSTRAINT uq_meter_reading UNIQUE (room_id, read_date),
    CONSTRAINT fk_meter_created_by
        FOREIGN KEY (created_by) REFERENCES user_account(id),
    CONSTRAINT fk_meter_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_account(id)
);



-- Cash Flow
CREATE TABLE cash_flow_category (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    code TEXT NOT NULL,
    chinese_name TEXT NOT NULL,
    direction cash_direction_type NOT NULL,
    category_group TEXT,

    CONSTRAINT pk_cash_flow_category PRIMARY KEY (id),
    CONSTRAINT uq_cash_flow_category_code UNIQUE (code)
);

CREATE TABLE cash_account (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    account_type cash_account_type NOT NULL,
    chinese_name TEXT NOT NULL,
    note TEXT,

    CONSTRAINT pk_cash_account PRIMARY KEY (id)
);

CREATE TABLE cash_flow (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    category_id BIGINT NOT NULL,
    cash_account_id BIGINT NOT NULL,
    lease_id BIGINT,
    building_id BIGINT,
    room_id BIGINT,
    invoice_id BIGINT,
    flow_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_method payment_method_type NOT NULL,
    note TEXT,
    deleted_at TIMESTAMPTZ,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,    

    CONSTRAINT pk_cash_flow PRIMARY KEY (id),
    CONSTRAINT fk_cf_category
        FOREIGN KEY (category_id) REFERENCES cash_flow_category(id),
    CONSTRAINT fk_cf_account
        FOREIGN KEY (cash_account_id) REFERENCES cash_account(id),
    CONSTRAINT fk_cf_lease
        FOREIGN KEY (lease_id) REFERENCES lease(id),
    CONSTRAINT fk_cf_building
        FOREIGN KEY (building_id) REFERENCES building(id),
    CONSTRAINT fk_cf_room
        FOREIGN KEY (room_id) REFERENCES room(id),
    CONSTRAINT fk_cf_invoice
        FOREIGN KEY (invoice_id) REFERENCES invoice(id),
    CONSTRAINT chk_cf_amount CHECK (amount >= 0),
    CONSTRAINT chk_cf_room_requires_building
        CHECK (
            (room_id IS NULL AND building_id IS NULL)
            OR
            (room_id IS NOT NULL AND building_id IS NOT NULL)
        ),
    CONSTRAINT fk_cf_created_by
        FOREIGN KEY (created_by) REFERENCES user_account(id),
    CONSTRAINT fk_cf_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_account(id)
);

CREATE TABLE cash_flow_attachment (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    cash_flow_id BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,

    CONSTRAINT pk_cash_flow_attachment PRIMARY KEY (id),
    CONSTRAINT fk_attachment_cf
        FOREIGN KEY (cash_flow_id)
        REFERENCES cash_flow(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_attachment_created_by
        FOREIGN KEY (created_by) REFERENCES user_account(id),
    CONSTRAINT fk_attachment_updated_by
        FOREIGN KEY (updated_by) REFERENCES user_account(id)
);

-- ############################################################
-- ### Indexes ###
-- ############################################################
CREATE UNIQUE INDEX uq_invoice_period_active
ON invoice(lease_id, category, period_start, period_end)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_rent_change_effective
ON lease_amendment(lease_id, effective_date)
WHERE amendment_type = 'rent_change'
  AND deleted_at IS NULL;

-- One primary tenant for each lease
CREATE UNIQUE INDEX uq_primary_tenant
ON lease_tenant(lease_id)
WHERE tenant_role = 'primary';

CREATE INDEX idx_invoice_lease ON invoice(lease_id);
CREATE INDEX idx_meter_room_date ON meter_reading(room_id, read_date);
CREATE INDEX idx_cf_date ON cash_flow(flow_date);
CREATE INDEX idx_cf_category ON cash_flow(category_id);
CREATE INDEX idx_cf_account ON cash_flow(cash_account_id);
CREATE INDEX idx_cf_lease ON cash_flow(lease_id);



-- ############################################################
-- ### Business Rule Trigger ###
-- ############################################################
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

CREATE OR REPLACE FUNCTION check_amendment_effective_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_lease_start_date DATE;
    v_lease_end_date DATE;
BEGIN
    SELECT l.start_date, l.end_date
    INTO v_lease_start_date, v_lease_end_date
    FROM lease l
    WHERE l.id = NEW.lease_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lease with id % not found', NEW.lease_id;
    END IF;

    -- Main rule: effective_date must not be before lease start_date
    IF NEW.effective_date < v_lease_start_date THEN
        RAISE EXCEPTION
            'Amendment effective_date (%) cannot precede lease start_date (%)', NEW.effective_date, v_lease_start_date;
    END IF;

    -- effective_date should not be after lease end_date
    IF NEW.effective_date > v_lease_end_date THEN
        RAISE EXCEPTION
            'Amendment effective_date (%) cannot be after lease end_date (%)',
            NEW.effective_date, v_lease_end_date;
    END IF;

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION prevent_deleted_parent()
RETURNS trigger AS $$
BEGIN
    IF NEW.lease_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM lease
        WHERE id = NEW.lease_id AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Referenced lease % is deleted', NEW.lease_id;
    END IF;

    IF NEW.room_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM room
        WHERE id = NEW.room_id AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Referenced room % is deleted', NEW.room_id;
    END IF;

    IF NEW.building_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM building
        WHERE id = NEW.building_id AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Referenced building % is deleted', NEW.building_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_deleted_room()
RETURNS trigger AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM room
        WHERE id = NEW.room_id
          AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION
            'Cannot create lease for deleted room %',
            NEW.room_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_deleted_tenant()
RETURNS trigger AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM tenant
        WHERE id = NEW.tenant_id
          AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION
            'Cannot assign deleted tenant % to lease',
            NEW.tenant_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_lease_assets()
RETURNS trigger AS $$
DECLARE
    elem JSONB;
BEGIN
    -- If assets is NULL (SQL NULL) or JSON null, it's valid
    IF NEW.assets IS NULL OR jsonb_typeof(NEW.assets) = 'null' THEN
        RETURN NEW;
    END IF;
    
    -- Check that assets is an array
    IF jsonb_typeof(NEW.assets) != 'array' THEN
        RAISE EXCEPTION 'assets must be a JSON array or null, got: %', jsonb_typeof(NEW.assets);
    END IF;
    
    -- Validate each element in the array
    FOR elem IN SELECT * FROM jsonb_array_elements(NEW.assets)
    LOOP
        -- Check that type is one of the allowed values
        IF elem->>'type' NOT IN ('key', 'fob', 'controller') THEN
            RAISE EXCEPTION 'Invalid asset type: %. Allowed types are: key, fob, controller', elem->>'type';
        END IF;
        
        -- Check that quantity is a positive integer
        IF (elem->>'quantity')::integer < 1 THEN
            RAISE EXCEPTION 'Asset quantity must be at least 1, got: %', elem->>'quantity';
        END IF;
    END LOOP;
    
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

CREATE TRIGGER trg_lease_no_deleted_room
BEFORE INSERT OR UPDATE ON lease
FOR EACH ROW
EXECUTE FUNCTION prevent_deleted_room();

CREATE TRIGGER trg_lease_validate_assets
BEFORE INSERT OR UPDATE ON lease
FOR EACH ROW
EXECUTE FUNCTION validate_lease_assets();

CREATE TRIGGER trg_lease_tenant_no_deleted_tenant
BEFORE INSERT OR UPDATE ON lease_tenant
FOR EACH ROW
EXECUTE FUNCTION prevent_deleted_tenant();

CREATE TRIGGER trg_lease_amendment_effective_date
BEFORE INSERT OR UPDATE OF effective_date, lease_id ON lease_amendment
FOR EACH ROW
EXECUTE FUNCTION check_amendment_effective_date();

-- =====================================================
-- soft_delete Function
-- =====================================================
-- Returns:
--   1 if a row was soft-deleted
--   0 if the row was already soft-deleted or not found
--  -1 if table not allowed
-- Raises exception only on critical errors (e.g. invalid column)
-- =====================================================

CREATE OR REPLACE FUNCTION soft_delete(p_table TEXT, p_id BIGINT)
RETURNS SMALLINT AS $$
DECLARE
    v_allowed_tables CONSTANT TEXT[] := ARRAY[
        'building',
        'room',
        'tenant',
        'lease',
        'invoice',
        'cash_flow',
        'lease_amendment'  -- added if you want to soft-delete amendments
    ];
    v_row_count INTEGER := 0;
BEGIN
    -- Validate table is allowed
    IF p_table = ANY(v_allowed_tables) THEN
        -- Use fully qualified safe dynamic SQL
        EXECUTE format(
            $dyn$
                UPDATE %I
                SET deleted_at = now()
                WHERE id = $1
                  AND deleted_at IS NULL
                RETURNING 1
            $dyn$,
            p_table
        )
        INTO v_row_count
        USING p_id;

        -- If no row was updated (either not found or already deleted)
        IF v_row_count IS NULL THEN
            v_row_count := 0;
        END IF;

        RETURN v_row_count;  -- 1 = deleted, 0 = already deleted or not found
    ELSE
        RETURN -1;  -- Table not allowed
    END IF;

EXCEPTION
    WHEN undefined_column THEN
        RAISE EXCEPTION 'Table % does not have expected columns (id or deleted_at)', p_table
        USING ERRCODE = 'undefined_column';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error soft-deleting % with id %: %', p_table, p_id, SQLERRM
        USING ERRCODE = SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;