truncate table room RESTART IDENTITY CASCADE;
truncate table building RESTART IDENTITY CASCADE;
truncate table role RESTART IDENTITY CASCADE;
truncate table user_role;
truncate table user_account RESTART IDENTITY CASCADE;

-- =========================
-- Security & Roles
-- =========================
INSERT INTO role (code, description) VALUES
('admin', 'System administrator'),
('manager', 'Property manager'),
('engineer', 'System engineer / developer');

INSERT INTO user_account (email, password_hash) VALUES
('bboy80345@gmail.com',   'admin1030'),
('ys.yang884532@gmail.com', 'manager884532');

-- =========================
-- Assign roles to users
-- =========================

-- admin user
INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id
FROM user_account u
JOIN role r ON r.code = 'admin'
WHERE u.email = 'bboy80345@gmail.com';

-- manager user
INSERT INTO user_role (user_id, role_id)
SELECT u.id, r.id
FROM user_account u
JOIN role r ON r.code = 'manager'
WHERE u.email = 'ys.yang884532@gmail.com';

-- =========================
-- Buildings
-- =========================

INSERT INTO building (building_no, address, created_by)
SELECT 2, '台南市鹽水區和平路65巷9弄2號', id FROM user_account WHERE email = 'bboy80345@gmail.com'
UNION
SELECT 6, '台南市鹽水區和平路65巷9弄6號', id FROM user_account WHERE email = 'bboy80345@gmail.com'
UNION
SELECT 147, '台南市鹽水區朝琴路147號', id FROM user_account WHERE email = 'bboy80345@gmail.com'
UNION
SELECT 149, '台南市鹽水區朝琴路149號', id FROM user_account WHERE email = 'bboy80345@gmail.com';


-- =========================
-- Rooms
-- =========================
INSERT INTO room (building_id, floor_no, room_no, created_by, updated_by)
SELECT b.id, v.floor_no, v.room_no, u.id, u.id
FROM building b, user_account u, (VALUES
    (2, 'A'),
    (3, 'A'),
    (3, 'B'),
    (4, 'A'),
    (4, 'B'),
    (5, 'A'),
    (5, 'B')
) AS v(floor_no, room_no)
WHERE b.building_no = 147 AND u.email = 'bboy80345@gmail.com';
    
    
-- # Building 149: 2A, 2B, 2C, 3A, 3B, 4A, 4B, 5A, 5B
INSERT INTO room (building_id, floor_no, room_no, created_by, updated_by)
SELECT b.id, v.floor_no, v.room_no, u.id, u.id
FROM building b, user_account u, (VALUES
    (2, 'A'), (2, 'B'), (2, 'C'),
    (3, 'A'), (3, 'B'),
    (4, 'A'), (4, 'B'),
    (5, 'A'), (5, 'B')
) AS v(floor_no, room_no)
WHERE b.building_no = 149 AND u.email = 'bboy80345@gmail.com';

-- Building 2: 1A, 1C, 1D, 2A, 2B, 2C, 2D, 2E, 3A, 3B, 3C, 3D, 3E, 4A, 4B, 4C, 4D, 4E, 5A, 5B, 5C, 5D, 5E    
INSERT INTO room (building_id, floor_no, room_no, created_by, updated_by)
SELECT b.id, v.floor_no, v.room_no, u.id, u.id
FROM building b, user_account u, (VALUES
    (1, 'A'), (1, 'C'), (1, 'D'),
    (2, 'A'), (2, 'B'), (2, 'C'), (2, 'D'), (2, 'E'),
    (3, 'A'), (3, 'B'), (3, 'C'), (3, 'D'), (3, 'E'),
    (4, 'A'), (4, 'B'), (4, 'C'), (4, 'D'), (4, 'E'),
    (5, 'A'), (5, 'B'), (5, 'C'), (5, 'D'), (5, 'E')
) AS v(floor_no, room_no)
WHERE b.building_no = 2 AND u.email = 'bboy80345@gmail.com';
    
-- Building 6: 1A, 1B, 1C, 1D, 1E, 2A, 2B, 2C, 2D, 2E, 2F, 3A, 3B, 3C, 3D, 3E, 3F, 4A, 4B, 4C, 4D, 4E, 4F, 5A, 5B, 5C, 5D, 5E, 5F
INSERT INTO room (building_id, floor_no, room_no, created_by, updated_by)
SELECT b.id, v.floor_no, v.room_no, u.id, u.id
FROM building b, user_account u, (VALUES
    (1, 'A'), (1, 'B'), (1, 'C'), (1, 'D'), (1, 'E'),
    (2, 'A'), (2, 'B'), (2, 'C'), (2, 'D'), (2, 'E'), (2, 'F'),
    (3, 'A'), (3, 'B'), (3, 'C'), (3, 'D'), (3, 'E'), (3, 'F'),
    (4, 'A'), (4, 'B'), (4, 'C'), (4, 'D'), (4, 'E'), (4, 'F'),
    (5, 'A'), (5, 'B'), (5, 'C'), (5, 'D'), (5, 'E'), (5, 'F')
) AS v(floor_no, room_no)
WHERE b.building_no = 6 AND u.email = 'bboy80345@gmail.com';

-- =========================
-- Cash Flow Categories
-- =========================

INSERT INTO cash_flow_category (code, name, direction) VALUES
('rent', '租金', '收入'),
('deposit_received', '押金', '收入'),
('deposit_returned', '退押金', '支出'),
('referral_fee', '介紹費', '支出'),
('tenant_electricity', '住戶電費', '支出'),
('manager_salary', '管理員薪水', '支出'),
('manager_bonus', '管理員獎金', '支出'),
('maintenance', '維修費', '支出'),
('new_equipment', '新設備', '支出'),
('building_electricity', '大樓電費支出', '支出'),
('water', '水費', '支出'),
('tax', '稅', '支出'),
('internet', '網路費', '支出'),
('stationery', '文具', '支出'),
('daily_supply', '日常用品', '支出'),
('misc', '其他', '支出'),
('bank_transfer', '匯馬玲帳戶', '轉帳'),
('bank_fee', '匯費', '支出');

-- =========================
-- Tenants & Leases
-- =========================
-- reset sequence when the table is empty
truncate table lease_tenant RESTART IDENTITY CASCADE;
truncate table tenant RESTART IDENTITY CASCADE;
truncate table lease RESTART IDENTITY CASCADE;

INSERT INTO tenant (first_name, last_name, gender, birthday, personal_id, phone, email, line_id, address, created_by, created_at) VALUES
('藩薇', '黃', '女', '1993-01-01', 'G578923810', '0955796021', 'test@gmail.com', null, 'test', 1, now()),
('士凱', '林', '男', '1993-01-01', 'T578923981', '0979990886', 'test@gmail.com', null, 'test', 1, now());

INSERT INTO lease (room_id, start_date, end_date, monthly_rent, deposit, pay_rent_on, payment_term, status, assets, vehicle_plate, created_by, created_at) VALUES
(24, '2025-02-02', '2026-01-01', 4500, 9000, 2, '月繳', '有效', $$[{"type": "鑰匙", "quantity": 1}, {"type": "磁扣", "quantity": 1}]$$, null, 1, now()),
(45, '2024-11-09', '2026-02-08', 4500, 9000, 9, '月繳', '有效', $$[{"type": "鑰匙", "quantity": 1}, {"type": "磁扣", "quantity": 1}]$$, null, 1, now());

INSERT INTO lease_tenant (lease_id, tenant_id, tenant_role, joined_at) VALUES
(1, 1, '主要', now()),
(2, 2, '主要', now());

insert into tenant_emergency_contact (tenant_id, first_name, last_name, relationship, phone) values
(1, '余修', '葉', '爸爸', '0903515096'),
(2, '茂霖', '駱', '爸爸', 'test');
