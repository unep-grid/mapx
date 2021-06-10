/**
* This sql template will search matching gemet concept and return 
* definition and label while using english as fallback.
* Example value returned :
*  [{
*    "definition": "Water, salty between the concentrations of fresh water and sea water; usually 5-10 parts x thousand.",
*    "label": "eau saumâtre",
*    "concept": "984",
*    "language": "fr"
*  }]
* Author: @thomaspiller
*/
WITH items AS (
  SELECT
  TYPE,
  text,
  concept,
  LANGUAGE
  FROM
  mx_gemet
  WHERE
  concept IN {{concept}}
  AND
  LANGUAGE IN
  ('en', '{{language}}')
),
labels AS (
  SELECT
  text AS label,
  concept,
  LANGUAGE
  FROM
  items
  WHERE
  TYPE = 'prefLabel'
),
definitions AS (
  SELECT
  text AS definition,
  concept,
  LANGUAGE
  FROM
  items
  WHERE
  TYPE = 'definition'
),
reshaped AS (
  SELECT
  d.definition,
  l.label,
  l.concept,
  l.language
  FROM
  labels l
  FULL OUTER JOIN definitions d ON l.concept = d.concept
  AND l.language = d.language
),
concepts AS (
  SELECT DISTINCT
  (concept)
  FROM
  items
),
combine as (
  SELECT
  json_build_object(
    'language',r.language,
    'concept',c.concept,
    'label',COALESCE(r.label, z.label),
    'definition', COALESCE(r.definition, z.definition)
  ) hits
  FROM concepts c
  LEFT JOIN reshaped r ON c.concept = r.concept
  AND r.language = '{{language}}'
  LEFT JOIN reshaped z ON c.concept = z.concept
  AND z.language = 'en'
)

SELECT * FROM combine;


