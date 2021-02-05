CREATE TABLE IF NOT EXISTS mx_patches (
    pid SERIAL PRIMARY KEY,
    id_patch varchar(300),
    timestamp timestamp default current_timestamp
)
