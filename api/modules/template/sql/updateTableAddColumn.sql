ALTER TABLE {{id_table}} 
ADD COLUMN IF NOT EXISTS "{{column_name}}" {{column_type}}

