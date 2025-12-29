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
    (1, 'F'),
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

INSERT INTO cash_flow_category (code, name, direction, category_group) VALUES
('rent', '租金', '收入', 'tenant'),
('deposit_received', '押金', '收入', 'tenant'),
('deposit_returned', '退押金', '支出', 'tenant'),
('referral_fee', '介紹費', '支出', 'operation'),
('tenant_electricity', '住戶電費', '支出', 'tenant'),
('manager_salary', '管理員薪水', '支出', 'operation'),
('manager_bonus', '管理員獎金', '支出', 'operation'),
('maintenance', '維修費', '支出', 'operation'),
('new_equipment', '新設備', '支出', 'operation'),
('building_electricity', '大樓電費支出', '支出', 'operation'),
('water', '水費', '支出', 'operation'),
('tax', '稅', '支出', 'operation'),
('internet', '網路費', '支出', 'operation'),
('stationery', '文具', '支出', 'operation'),
('daily_supply', '日常用品', '支出', 'operation'),
('misc', '其他', '支出', 'operation'),
('bank_transfer', '匯馬玲帳戶', '轉帳', 'operation'),
('laundry_income', '洗烘衣機收入', '收入', 'operation'),
('bank_fee', '匯費', '支出', 'operation');

