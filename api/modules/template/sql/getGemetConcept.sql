SELECT
  json_build_object(
    'language',
    language,
    'concept',
    concept,
    'label',
    label,
    'definition',
    definition
  ) hits
FROM
  mx_gemet g
WHERE
  concept in {{concept}}
  AND language = '{{language}}';
