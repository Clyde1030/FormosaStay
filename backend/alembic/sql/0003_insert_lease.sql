-- =========================
-- Tenants & Leases
-- =========================
-- reset sequence when the table is empty
truncate table lease_tenant RESTART IDENTITY CASCADE;
truncate table tenant RESTART IDENTITY CASCADE;
truncate table lease RESTART IDENTITY CASCADE;

INSERT INTO tenant (first_name, last_name, gender, birthday, personal_id, phone, email, line_id, home_address, created_by, created_at) VALUES
('藩薇', '黃', 'F', '1993-01-01', 'G578923810', '0955796021', 'test@gmail.com', null, 'test', 1, now()),
('士凱', '林', 'M', '1993-01-01', 'T578923981', '0979990886', 'test@gmail.com', null, 'test', 1, now());

INSERT INTO lease (room_id, start_date, end_date, monthly_rent, deposit, pay_rent_on, payment_term, assets, vehicle_plate, created_by, created_at) VALUES
(24, '2025-02-02', '2026-01-01', 4500, 9000, 2, 'monthly', $$[{"type": "key", "quantity": 1}, {"type": "fob", "quantity": 1}]$$, null, 1, now()),
(45, '2024-11-09', '2026-02-08', 4500, 9000, 9, 'monthly', $$[{"type": "key", "quantity": 1}, {"type": "fob", "quantity": 1}]$$, null, 1, now());

INSERT INTO lease_tenant (lease_id, tenant_id, tenant_role, joined_at) VALUES
(1, 1, 'primary', now()),
(2, 2, 'primary', now());

insert into tenant_emergency_contact (tenant_id, first_name, last_name, relationship, phone) values
(1, '余修', '葉', '爸爸', '0903515096'),
(2, '茂霖', '駱', '爸爸', 'test');
