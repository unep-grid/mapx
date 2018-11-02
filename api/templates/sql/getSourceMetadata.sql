SELECT data #> '{"meta"}' AS metadata
FROM mx_sources
WHERE id = '{{idSource}}'
 
