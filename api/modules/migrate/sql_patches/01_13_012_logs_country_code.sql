-- Step 1: Create IP to Country mapping table
CREATE TABLE _ip_country AS
WITH i_c AS ( 
    SELECT ip_user, data->>'country' country_code 
    FROM mx_logs 
    ORDER BY date_modified DESC 
),
d_c AS (
    SELECT DISTINCT ip_user, country_code 
    FROM i_c
)
SELECT * FROM d_c WHERE country_code IS NOT NULL;

CREATE INDEX idx_ip_country_ip ON _ip_country(ip_user);

-- Step 2: Create new table with CTAS
CREATE TABLE mx_logs_c AS
SELECT 
    l.*,
    COALESCE(
        UPPER(l.data->>'country'),  -- First try to get from current record
        ic.country_code             -- Fall back to IP mapping
    ) as country_code
FROM mx_logs l
LEFT JOIN _ip_country ic ON l.ip_user = ic.ip_user;

-- Step 3: Recreate primary key and indexes
CREATE INDEX mx_logs_c_id_log_data_date_idx 
    ON mx_logs_c (id_log, (data #>> '{id_view}'::text[]), date_modified);
CREATE INDEX mx_logs_c_ip_user_idx ON mx_logs_c (ip_user);
CREATE INDEX mx_logs_c_country_code_idx ON mx_logs_c (country_code);

-- Step 5: Rename tables
ALTER TABLE mx_logs RENAME TO mx_logs_backup;
ALTER TABLE mx_logs_c RENAME TO mx_logs;

GRANT SELECT ON TABLE mx_logs TO mapxr;
GRANT SELECT, INSERT ON TABLE mx_logs TO mapxw;

ALTER TABLE mx_logs
ALTER COLUMN pid SET DEFAULT nextval('mx_logs_pid_seq'::regclass);

DROP TABLE _ip_country;
