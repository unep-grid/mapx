\set env_mapxr_password `echo "$POSTGRES_USER_READ_PASSWORD"`
\set env_mapxw_password `echo "$POSTGRES_USER_WRITE_PASSWORD"`
\set env_mapxc_password `echo "$POSTGRES_USER_CUSTOM_PASSWORD"`
--
-- Roles read/write
--

CREATE ROLE readonly;
ALTER ROLE readonly WITH 
NOSUPERUSER 
INHERIT 
NOCREATEROLE 
NOCREATEDB 
NOLOGIN 
NOREPLICATION
NOBYPASSRLS;

CREATE ROLE readwrite;
ALTER ROLE readwrite WITH 
NOSUPERUSER 
INHERIT 
NOCREATEROLE 
NOCREATEDB 
NOLOGIN 
NOREPLICATION 
NOBYPASSRLS;

--
--  Mapx roles
--
CREATE ROLE mapxw;
ALTER ROLE mapxw WITH 
LOGIN 
PASSWORD :'env_mapxw_password';

CREATE ROLE mapxr;
ALTER ROLE mapxr WITH
LOGIN 
PASSWORD :'env_mapxr_password';

CREATE ROLE mapxc;
ALTER ROLE mapxc
WITH 
LOGIN 
PASSWORD : 'env_mapxc_password';

GRANT USAGE ON SCHEMA public TO readonly;
GRANT USAGE ON SCHEMA public TO readwrite;
ALTER DEFAULT PRIVILEGES FOR USER mapxw IN SCHEMA public GRANT SELECT ON TABLES TO readonly;

GRANT readwrite TO mapxw;
GRANT readonly TO mapxr;
GRANT readonly TO mapxc;


