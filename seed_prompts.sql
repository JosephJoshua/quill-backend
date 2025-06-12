UPDATE "user"
SET "roles" = ARRAY['user', 'admin']::user_roles_enum[]
WHERE "email" = 'jj.anggita@gmail.com';

