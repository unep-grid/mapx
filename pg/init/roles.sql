--
-- readonly
--
CREATE ROLE readonly;
-- connect
GRANT CONNECT ON DATABASE mapx TO readonly;
-- usage
GRANT USAGE ON SCHEMA public to readonly;
-- privilege
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
-- execute
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO readonly;
--
-- mapxr (password set later)
--
CREATE ROLE mapxr WITH LOGIN ENCRYPTED PASSWORD '-' IN ROLE readonly;
--
-- readwrite
--
CREATE ROLE readwrite;
-- connect
GRANT CONNECT ON DATABASE mapx TO readwrite;
-- usage
GRANT USAGE ON SCHEMA public to readwrite;
-- privileges
GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA public TO readwrite;
-- execute
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO readwrite;
--
-- mapxw (password set later)
--
CREATE ROLE mapxw WITH LOGIN ENCRYPTED PASSWORD '-' IN ROLE readwrite;
ALTER ROLE mapxw WITH CREATEROLE;
-- 
-- Give select privilege to readonly for FUTURE table created by mapxw;
--
ALTER DEFAULT PRIVILEGES FOR ROLE mapxw GRANT SELECT ON TABLES TO readonly;


ALTER ROLE mapxw SUPERUSER;

