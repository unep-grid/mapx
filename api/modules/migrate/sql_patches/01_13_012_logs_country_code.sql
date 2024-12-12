ALTER TABLE mx_logs
DROP COLUMN IF EXISTS country_code;

DROP TABLE IF EXISTS mx_logs_cc CASCADE;

CREATE TABLE
  mx_logs_cc AS
WITH
  cc AS (
    SELECT
      *,
      data #>> '{"country"}' AS country_code
    FROM
      mx_logs
  )
SELECT
  ROW_NUMBER() OVER (
    ORDER BY
      date_modified
  ) AS pid,
  level,
  side,
  id_log,
  id_user,
  is_guest,
  id_project,
  date_modified,
  data,
  ip_user,
  is_static,
  NULLIF(country_code, '') AS country_code
FROM
  cc
ORDER BY
  date_modified ASC;

CREATE SEQUENCE mx_logs_cc_pid_seq OWNED BY mx_logs_cc.pid;

ALTER TABLE mx_logs_cc
ALTER COLUMN pid
SET DEFAULT nextval('mx_logs_cc_pid_seq');

SELECT
  setval(
    'mx_logs_cc_pid_seq',
    (
      SELECT
        MAX(pid)
      FROM
        mx_logs_cc
    )
  );

ALTER TABLE mx_logs_cc
ADD PRIMARY KEY (pid);

CREATE INDEX mx_logs_cc_ip_user_date_modified_idx ON mx_logs_cc (ip_user, date_modified);

CREATE INDEX mx_logs_cc_id_log_idx ON mx_logs_cc (id_log);

CREATE TABLE
  mx_logs_session_start AS (
    SELECT
      id_log,
      ip_user,
      country_code,
      date_modified
    FROM
      mx_logs_cc
    WHERE
      id_log = 'session_start'
      AND NOT ip_user IS NULL
      AND NOT country_code IS NULL
  );

CREATE INDEX mx_logs_session_start_ip_user_date_modified_idx ON mx_logs_session_start (ip_user, date_modified);

CREATE TABLE
  mx_logs_nearest_session_start AS (
    SELECT
      l.id_log,
      l.ip_user,
      l.date_modified,
      s.country_code
    FROM
      mx_logs_cc l
      LEFT JOIN mx_logs_session_start s ON l.ip_user = s.ip_user
      AND s.date_modified = (
        SELECT
          MAX(date_modified)
        FROM
          mx_logs_session_start
        WHERE
          date_modified <= l.date_modified
          AND ip_user = l.ip_user
      )
    WHERE
      NOT l.id_log = 'session_start'
      AND NOT l.ip_user IS NULL
      AND l.country_code IS NULL
  );

UPDATE mx_logs_cc l
SET
  country_code = nss.country_code
FROM
  mx_logs_nearest_session_start nss
WHERE
  l.id_log = nss.id_log
  AND l.ip_user = nss.ip_user
  AND l.date_modified = nss.date_modified;

DROP TABLE mx_logs_session_start;

DROP TABLE mx_logs_nearest_session_start;

DROP INDEX mx_logs_cc_ip_user_date_modified_idx;

DROP INDEX mx_logs_cc_id_log_idx;

CREATE INDEX mx_logs_cc_id_log_data_date_idx ON mx_logs_cc (
  id_log,
  (data #>> '{id_view}'::text[]),
  date_modified
);

CREATE INDEX mx_logs_cc_ip_user_idx ON mx_logs_cc (ip_user);

CREATE INDEX mx_logs_cc_country_code_idx ON mx_logs_cc (country_code);

DO $$ 
DECLARE 
  table_name text;
BEGIN
  table_name := 'mx_logs_backup_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MI');

  EXECUTE format('ALTER TABLE mx_logs RENAME TO %I', table_name);
  EXECUTE format('ALTER SEQUENCE IF EXISTS mx_logs_pid_seq RENAME TO %I', concat(table_name, '_pid_seq'));
  EXECUTE format('ALTER INDEX IF EXISTS mx_logs_id_log_data_date_idx RENAME TO %I', concat(table_name, '_id_log_data_date_idx'));
  EXECUTE format('ALTER INDEX IF EXISTS mx_logs_ip_user_idx RENAME TO %I', concat(table_name, '_ip_user_idx'));
  EXECUTE format('ALTER INDEX IF EXISTS mx_logs_country_code_idx RENAME TO %I', concat(table_name, '_country_code_idx'));
END $$;

ALTER TABLE mx_logs_cc
RENAME TO mx_logs;

ALTER SEQUENCE IF EXISTS mx_logs_cc_pid_seq
RENAME TO mx_logs_pid_seq;

ALTER INDEX IF EXISTS mx_logs_cc_id_log_data_date_idx
RENAME TO mx_logs_id_log_data_date_idx;

ALTER INDEX IF EXISTS mx_logs_cc_ip_user_idx
RENAME TO mx_logs_ip_user_idx;

ALTER INDEX IF EXISTS mx_logs_cc_country_code_idx
RENAME TO mx_logs_country_code_idx;

GRANT
SELECT
  ON TABLE mx_logs TO mapxr;

GRANT
SELECT
, INSERT ON TABLE mx_logs TO mapxw;

GRANT USAGE ON SEQUENCE mx_logs_pid_seq TO mapxw;
