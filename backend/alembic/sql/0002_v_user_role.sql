-- user account
CREATE OR REPLACE VIEW v_user_role AS
select
	ur.user_id,
	ur.role_id,
	e.id as employee_id,
	e.last_name || e.first_name as employee_name,
	e.phone as employee_phone,
	r.code as role,
	r.description as role_description,
	ua.email,
	ua.user_password,
	ua.created_at,
	ua.is_active	
from user_role ur
left join role r  on ur.role_id = r.id  
left join user_account ua on ua.id = ur.user_id
left join employee e on e.role_id = r.id















