-- =========================
-- Security & Roles
-- =========================

DELETE FROM room;
DELETE FROM building;
DELETE FROM user_role;
DELETE FROM user_account;


INSERT INTO role (code, description) VALUES
('admin', 'System administrator'),
('manager', 'Property manager'),
('engineer', 'System engineer / developer');


INSERT INTO user_account (email, password_hash)
VALUES
    ('bboy80345@gmail.com',   'admin1030'),
    ('ys.yang884532@gmail.com', 'manager884532')
RETURNING id, email;


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

INSERT INTO building (
    building_no,
    address,
    created_by
)
SELECT
    2,
    '台南市鹽水區和平路65巷9弄2號',
    id
FROM user_account
WHERE email = 'bboy80345@gmail.com';

INSERT INTO building (
    building_no,
    address,
    created_by
)
SELECT
    6,
    '台南市鹽水區和平路65巷9弄6號',
    id
FROM user_account
WHERE email = 'bboy80345@gmail.com';

INSERT INTO building (
    building_no,
    address,
    created_by
)
SELECT
    147,
    '台南市鹽水區朝琴路149號',
    id
FROM user_account
WHERE email = 'bboy80345@gmail.com';

INSERT INTO building (
    building_no,
    address,
    created_by
)
SELECT
    149,
    '台南市鹽水區朝琴路149號',
    id
FROM user_account
WHERE email = 'bboy80345@gmail.com';


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
