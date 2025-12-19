-- =========================
-- Security & Roles
-- =========================

DELETE FROM room;
DELETE FROM building;
DELETE FROM user_role;
DELETE FROM user_account;

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
