SELECT id, email
FROM mx_users
WHERE 
id = $1::integer AND 
key = $2::text
