-- Don't use FULL if launched from routine script : multiple api 
-- instance could be launched at once, which will lock tables
VACUUM (ANALYZE) mx_users, mx_views, mx_sources;
