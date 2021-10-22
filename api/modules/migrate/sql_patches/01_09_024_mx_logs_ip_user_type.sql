ALTER TABLE mx_logs ALTER COLUMN ip_user TYPE inet USING ip_user::inet;
