ALTER TABLE mx_logs
ADD COLUMN IF NOT EXISTS hostname VARCHAR(253);

CREATE INDEX IF NOT EXISTS mx_logs_hostname_idx
    ON mx_logs (hostname);
