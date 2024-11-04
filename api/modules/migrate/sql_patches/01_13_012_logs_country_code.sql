-- Clean up any leftover temporary objects from failed previous runs
DROP TABLE IF EXISTS _tmp_ip_country;
DROP TABLE IF EXISTS _tmp_logs;

-- Backup
DO $$
DECLARE
    backup_table_name text;
BEGIN
    backup_table_name := '_mx_logs_backup_' || to_char(current_timestamp, 'YYYYMMDD_HH24MISS');
    RAISE NOTICE 'Creating backup table: %', backup_table_name;
    EXECUTE 'CREATE TABLE ' || quote_ident(backup_table_name) ||' AS SELECT * FROM mx_logs;';
END $$;

-- Clear new column if already exists
DO $$
BEGIN
    RAISE NOTICE 'Ensuring clean state: removing country_code column if exists';
    ALTER TABLE mx_logs DROP COLUMN IF EXISTS country_code;
    ALTER TABLE mx_logs DROP COLUMN IF EXISTS pid;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'Starting IP to Country mapping (this might take a while)...';
END $$;

--  Create temporary IP to Country mapping table 
CREATE TABLE _tmp_ip_country AS
WITH _tmp_ip_country_mapping AS (
    SELECT
        ip_user,
        NULLIF(TRIM(data ->> 'country'), '') as country_code -- Convert empty strings to NULL
    FROM mx_logs
    ORDER BY date_modified DESC
),
distinct_mappings AS (
    SELECT DISTINCT ip_user, country_code
    FROM _tmp_ip_country_mapping
),
unmapped_ips AS (
    SELECT DISTINCT ip_user
    FROM distinct_mappings
    WHERE country_code IS NULL
),
ip_lookups AS (
    SELECT DISTINCT
        u.ip_user,
        m.country_iso_code as country_code
    FROM unmapped_ips u
    JOIN mx_ip m ON host(u.ip_user)::inet <<  m.network
),
combined as (
    SELECT ip_user, country_code
    FROM distinct_mappings
    WHERE country_code IS NOT NULL
    UNION ALL
    SELECT ip_user, country_code
    FROM ip_lookups
)
SELECT DISTINCT ip_user, country_code FROM combined;

CREATE INDEX idx__tmp_ip_country_ip ON _tmp_ip_country(ip_user);



DO $$
BEGIN
    RAISE NOTICE 'Creating new logs table with country_code column...';
END $$;

-- Create new table with country code column
CREATE TABLE _tmp_logs AS
SELECT
    l.*,
    ROW_NUMBER () OVER ( ORDER BY date_modified ) pid,
    COALESCE(
        NULLIF(TRIM(UPPER(l.data ->> 'country')), ''),
        ic.country_code
    ) AS country_code
FROM mx_logs l
LEFT JOIN _tmp_ip_country ic ON l.ip_user = ic.ip_user
ORDER BY date_modified;

DO $$
BEGIN
    RAISE NOTICE 'Switching tables (quick operation)...';
END $$;

-- Remove logs table and replace it
DROP TABLE mx_logs CASCADE;
ALTER TABLE _tmp_logs RENAME TO mx_logs;

DO $$
BEGIN
    RAISE NOTICE 'Creating indexes (this will take some time)...';
END $$;

-- Create indexes and primary key on new table
DROP INDEX IF EXISTS mx_logs_id_log_data_date_idx;
CREATE INDEX mx_logs_id_log_data_date_idx ON mx_logs (
    id_log,
    (data #>> '{id_view}'::text[]),
    date_modified
);
DROP INDEX IF EXISTS mx_logs_ip_user_idx;
CREATE INDEX mx_logs_ip_user_idx ON mx_logs (ip_user);
DROP INDEX IF EXISTS mx_logs_country_code_idx;
CREATE INDEX mx_logs_country_code_idx ON mx_logs (country_code);
ALTER TABLE mx_logs ADD PRIMARY KEY (pid);

DO $$
BEGIN
    RAISE NOTICE 'Setting up sequence and permissions...';
END $$;

DROP SEQUENCE IF EXISTS mx_logs_pid_seq CASCADE;
CREATE SEQUENCE mx_logs_pid_seq;
SELECT SETVAL('mx_logs_pid_seq', (SELECT COALESCE(MAX(pid), 1) FROM mx_logs));
ALTER TABLE mx_logs ALTER COLUMN pid SET DEFAULT nextval('mx_logs_pid_seq'::regclass);

-- Set permissions
GRANT SELECT ON TABLE mx_logs TO mapxr;
GRANT SELECT, INSERT ON TABLE mx_logs TO mapxw;

DO $$
BEGIN
    RAISE NOTICE 'Cleaning up temporary tables...';
END $$;

-- cleanup
DROP TABLE _tmp_ip_country;

DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
END $$;
