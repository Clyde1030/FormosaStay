-- tenant join contract (updated to use lease_tenant relationship)
CREATE OR REPLACE VIEW v_tenant_lease AS
select 
    t.*,
    lt.lease_id,
    lt.tenant_role,
    lt.joined_at,
    l.*
from tenant t
left join lease_tenant lt on lt.tenant_id = t.id
left join lease l on l.id = lt.lease_id;

-- user account
CREATE OR REPLACE VIEW v_user_role AS
select
	ur.user_id,
	ur.role_id,
	r.code as role,
	r.description as role_description,
	ua.email,
	ua.password_hash,
	ua.created_at,
	ua.is_active	
from user_role ur
left join role r  on ur.role_id = r.id  
left join user_account ua on ua.id = ur.user_id

-- room availability
CREATE VIEW v_room_availability AS
SELECT r.*,
       (
         r.is_rentable
         AND NOT EXISTS (
           SELECT 1
           FROM lease l
           WHERE l.room_id = r.id
             AND l.status = '有效'
             AND l.deleted_at IS NULL
         )
       ) AS is_available
FROM room r
WHERE r.deleted_at IS NULL;
