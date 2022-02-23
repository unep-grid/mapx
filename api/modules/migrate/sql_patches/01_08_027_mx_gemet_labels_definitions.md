## Gemet db -> mapx mx_gemet

Using a copy of the GEMET database requested from https://www.eionet.europa.eu/gemet/, we buit a table for all concepts labels and definitions, for all MapX languages. The dump was then saved in `api/modules/migrate/sql_patches`

*warning* Manual work is needed to be applied as a patch, see next section

### Script to reshape

The script to build the table *where the gemet db exists; e.g. not in mapx db instance*:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP TABLE IF EXISTS public.mx_gemet CASCADE;

CREATE TABLE public.mx_gemet AS
with languages_mapx as (
  SELECT
    unnest(
      array [
	'fr',
      'en',
      'es',
      'ar',
      'ru',
      'zh',
      'de',
      'bn',
      'fa',
      'ps' ]
    ):: varchar AS language
),
concepts as (
  SELECT
    DISTINCT code:: int as concept,
    id as concept_id
  from
    thesaurus_concept
  WHERE
    namespace_id = 1
),
base as (
  SELECT
    concept,
    concept_id,
    language
  FROM
    languages_mapx,
    concepts
),
texts as (
  SELECT
    concept_id,
    value as text,
    name as type,
    CASE
      WHEN language_id = 'zh-CN' THEN 'zh'
      ELSE language_id
    END as language
  FROM
    thesaurus_property p
  WHERE
    name in ('definition', 'prefLabel')
    and status = 'published'
),
lab as (
  select
    text as label,
    concept_id,
    language
  from
    texts
  where
    type = 'prefLabel'
),
def as (
  select
    text as definition,
    language,
    concept_id
  from
    texts
  where
    type = 'definition'
),
lab_en as (
  select
    text as label,
    concept_id
  from
    texts
  where
    type = 'prefLabel'
    AND language = 'en'
),
def_en as (
  select
    text as definition,
    concept_id
  from
    texts
  where
    type = 'definition'
    AND language = 'en'
),
combine as (
  select
    row_number() over () as id,
    b.concept,
    b.concept_id,
    b.language,
    coalesce(nullif(d.definition, ''), d_en.definition) as definition,
    coalesce(nullif(l.label, ''), l_en.label) as label
  from
    base b
    left join def d using (concept_id, language)
    left join lab l using (concept_id, language)
    left join def_en d_en using (concept_id)
    left join lab_en l_en using (concept_id)
)
select
  *
from
  combine;

ALTER TABLE ONLY public.mx_gemet
    ADD CONSTRAINT mx_gemet_pkey PRIMARY KEY (id);

CREATE INDEX mx_gemet_id_idx ON public.mx_gemet USING btree (id);
CREATE INDEX mx_gemet_concept_idx ON public.mx_gemet USING btree (concept);
CREATE INDEX mx_gemet_definition_idx ON public.mx_gemet USING gin (definition public.gin_trgm_ops);
CREATE INDEX mx_gemet_label_idx ON public.mx_gemet USING gin (label public.gin_trgm_ops);

```

### Dump command

The command to generate the dump was :

```sh
# Sample command to generate the mx_gemet dump

note : `copy` would be faster, but it fails each time at import, some values are not properly escaped.

pg_dump \
    --file "1.8.26_mx_gemet_labels_definitions.sql"\
    --host "<db gemet>" \
    --port "<db port>" \
    --username "<db user>" \
    --format=p \
    --inserts \
    --encoding "UTF8" \
    --table "public.mx_gemet" "gemet"
```

*Manual work to clean the dump*

note: this could be configured in `pg_dump` ?

- CREATE EXTENSION IF NOT EXISTS pg_trgm;
- ADD `GRANT select ON mx_gemet TO mapxr`;
- Check ownership: it should be mapxw, e.g. `ALTER TABLE public.mx_gemet OWNER TO mapxw;`
- Remove psql `SET` instruction
- ADD `DROP TABLE IF EXISTS mx_gemet CASCADE` at the top
- reformat inserts to have :
  INSERT ... values (...),(...); instead of one insert per line.
