SELECT 
s.data #> '{"meta"}' AS metadata, 
s.date_modified AS date_modified, 
u.email AS email_editor,
s.services AS services
FROM mx_sources s, mx_users u
WHERE s.id = '{{idSource}}' AND s.editor = u.id
