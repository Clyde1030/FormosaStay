-- =========================
-- Tenants & Leases
-- =========================
-- reset sequence when the table is empty
truncate table lease_tenant RESTART IDENTITY CASCADE;
truncate table tenant RESTART IDENTITY CASCADE;
truncate table lease RESTART IDENTITY CASCADE;
truncate table tenant_emergency_contact RESTART IDENTITY CASCADE;

INSERT INTO tenant (first_name, last_name, gender, birthday, personal_id, phone, email, line_id, home_address, created_by, created_at) VALUES
('藩薇', '黃', 'F', '1990-01-01', 'mocked_id_1', '0955796021', 'test@gmail.com', null, 'test_address', 1, now()),
('紅華', '郭', 'F', '1990-01-01', 'mocked_id_2', '0978351963', 'test@gmail.com', null, 'test_address', 1, now()),
('郁涵', '裴', 'F', '1990-01-01', 'mocked_id_3', '0983852337', 'test@gmail.com', null, 'test_address', 1, now()),
('台泥', '台泥', 'F', '1990-01-01', 'mocked_id_4', '0983852337', 'test@gmail.com', null, 'test_address', 1, now()),
('士凱', '林', 'M', '1990-01-01', 'mocked_id_5', '0979990886', 'test@gmail.com', null, 'test_address', 1, now()),
('汾漁', '蔡', 'F', '1990-01-01', 'mocked_id_6', '0988678543', 'test@gmail.com', null, 'test_address', 1, now()),
('嘉隆', '陳', 'M', '1990-01-01', 'mocked_id_7', '0966753489', 'test@gmail.com', null, 'test_address', 1, now());


INSERT INTO lease (room_id, start_date, end_date, submitted_at, monthly_rent, deposit, pay_rent_on, payment_term, assets, vehicle_plate, created_by, created_at) VALUES
(24, '2025-02-02', '2026-02-01', '2025-02-01', 4500, 9000, 2, 'monthly', $$[{"type": "key", "quantity": 1}, {"type": "fob", "quantity": 1}]$$, null, 1, now()),
(37, '2025-01-25', '2025-07-24', '2025-01-25', 4500, 9000, 25, 'monthly', $$[{"type": "key", "quantity": 1}, {"type": "fob", "quantity": 1}]$$, null, 1, now()),
(38, '2025-02-14', '2025-08-13', '2025-02-13', 4500, 9000, 14, 'monthly', $$[{"type": "key", "quantity": 1}, {"type": "fob", "quantity": 1}]$$, null, 1, now()),
(59, '2025-02-22', '2026-02-21', '2025-02-13', 4200, 8400, 22, 'monthly', $$[{"type": "key", "quantity": 1}, {"type": "fob", "quantity": 1}]$$, null, 1, now()),
(45, '2024-11-09', '2026-02-08', '2024-11-08', 4500, 9000, 9, 'monthly', $$[{"type": "key", "quantity": 1}, {"type": "fob", "quantity": 1}]$$, null, 1, now()),
(4, '2025-06-21', '2026-06-20', '2026-01-05', 5000, 10000, 1, 'monthly', $$[{"type": "key", "quantity": 1}, {"type": "fob", "quantity": 1}]$$, '358PPH', 1, now());

INSERT INTO lease_tenant (lease_id, tenant_id, tenant_role, joined_at) VALUES
(1, 1, 'primary', now()),
(2, 2, 'primary', now()),
(3, 3, 'primary', now()),
(4, 4, 'primary', now()),
(5, 5, 'primary', now());

insert into tenant_emergency_contact (tenant_id, first_name, last_name, relationship, phone) values
(1, '余修', '葉', '父親', '0903515096'),
(2, '文文', '河', '母親', '0932855663'),
(3, '蓓薇', '黃', '母親', '0955796021'),
(5, '茂霖', '駱', '父親', 'mocked_phone');

