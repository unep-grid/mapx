SELECT 
data#>'{"attribute","names"}' as attributes,
data#>'{"attribute","name"}' as attribute,
data#>'{"source","layerInfo","name"}' as layer,
data#>'{"source","layerInfo","maskName"}' as mask
FROM mx_views
WHERE id = '{{idView}}'
ORDER BY date_modified DESC
LIMIT 1
