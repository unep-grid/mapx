# Create table `mx_project`

Exportation and re-imporation of a dump

### 

```sh
 pg_dumpall -U postgres | gzip > db.dump.gz
```

```sql
drop database mapx
```

```sh
gunzip -d db.dump.gz
psql -f -U postgres db.dump postgres
```


```sql
create table if not exists mx_projects (
  pid serial PRIMARY KEY,
  id character varying(40) unique not null,
  id_old character varying(3),
  title jsonb,
  description jsonb,
  active boolean,
  public boolean default true,
  admins jsonb,
  members jsonb,
  publishers jsonb,
  map_position jsonb,
  countries jsonb,
  creator integer,
  date_created timestamp with time zone default now(),
  date_modified timestamp with time zone default now(),
  views_external jsonb default '[]'::jsonb
);
 
ALTER TABLE mx_projects OWNER TO mapxw;


CREATE INDEX ON mx_projects (id);
CREATE INDEX ON mx_projects (id_old);
CREATE INDEX ON mx_projects USING gin (members);
CREATE INDEX ON mx_projects USING gin (publishers);
CREATE INDEX ON mx_projects USING gin (admins);
```

# Convert views and sources columns

## views
```sql
ALTER TABLE mx_views ADD COLUMN project varchar(22);
ALTER TABLE mx_views ALTER project TYPE varchar(22) USING country;
UPDATE mx_views SET data = jsonb_set(data,'{"projects"}',data -> 'countries',true) WHERE data -> 'countries' IS NOT NULL;
/* delete old key*/
UPDATE mx_views SET data = data - 'countries';
ALTER TABLE mx_views ADD COLUMN readers jsonb;
ALTER TABLE mx_views ADD COLUMN editors jsonb;
CREATE INDEX ON mx_views USING gin (readers);
CREATE INDEX ON mx_views USING gin (editors);
```

## sources
```sql

ALTER TABLE mx_sources ADD COLUMN project varchar(22);
ALTER TABLE mx_sources ALTER project type varchar(22) using country;
ALTER TABLE mx_sources ADD COLUMN readers jsonb;
ALTER TABLE mx_sources ADD COLUMN editors jsonb;
CREATE INDEX ON mx_sources USING gin (readers);
CREATE INDEX ON mx_sources USING gin (editors);

```

# Update views readers and editors

## views
```sql

UPDATE mx_views SET readers =
 CASE WHEN target@>'["self"]' THEN '[]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["public"]' THEN '["public"]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["publisher"]' THEN '["publishers"]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["user"]' THEN '["members"]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["admin"]' OR target@>'["superuser"]' THEN '["admins"]'::jsonb ELSE '[]'::jsonb END ;

UPDATE mx_views SET editors =
 CASE WHEN target@>'["self"]' THEN '[]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["publisher"]' OR target@>'["public"]' OR target@>'["user"]' THEN '["publishers"]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["admin"]' OR target@>'["superuser"]' THEN '["admins"]'::jsonb ELSE '[]'::jsonb END ;

```

## Sources
```sql

UPDATE mx_sources SET readers =
 CASE WHEN target@>'["self"]' THEN '[]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["public"]' THEN '["public"]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["publisher"]'  THEN '["publishers"]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["user"]' THEN '["members"]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["admin"]' OR target@>'["superuser"]' THEN '["admins"]'::jsonb ELSE '[]'::jsonb END ;

UPDATE mx_sources SET editors =
 CASE WHEN target@>'["self"]' THEN '[]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["publisher"]' OR target@>'["public"]'  OR target@>'["user"]' THEN '["publishers"]'::jsonb ELSE '[]'::jsonb END ||
 CASE WHEN target@>'["admin"]' OR target@>'["superuser"]' THEN '["admins"]'::jsonb ELSE '[]'::jsonb END ;

```


# Convert country table to project table

```r
source('global.R')
countries <- config$countries$table
countries_iso3 <- countries[!countries$iso3 %in% c("XXX"),c("iso3")]
languages <- as.character(config$languages$list)
dictCountries <- config$dictionaries$countries

titles <- lapply(countries_iso3,function(c){
  
  res <- lapply(languages,function(l){
    d(c,l,web=F,dict=dictCountries)
})
  names(res)<-languages
  res <- toJSON(res,auto_unbox=T)
  res <- as.character(res)
  return(res)
})

mapPos <- lapply(countries_iso3,function(c){
  pos <- countries[countries$iso3 == c,c("lng","lat","zoom")][1,] 
  names(pos) <- c("lng","lat","z")
  pos <- as.list(pos)
  pos <- toJSON(pos,auto_unbox=T)
  return(pos)
})


for(i in 1:length(countries_iso3)){

r <- list(
    pid = i,
    id = randomString("MX-",splitIn=5,addLetters=F,addLETTERS=T,splitSep="-",sep="-"),
    id_old = countries_iso3[i],
    title = titles[[i]],
    description = list(),
    map_position = mapPos[[i]],
    active = TRUE,
    creator = 1,
    admins = toJSON(1),
    members = toJSON(list()),
    publishers = toJSON(1),
    countries = toJSON(countries_iso3[i]),
    date_modified = Sys.time(),
    date_created = Sys.time(),
    public = TRUE
    )
  
  mxDbAddRow(r,"mx_projects")

}

```


# Update views based on project


## Update views

```sql

WITH ids as (
    select distinct id, id_old from mx_projects
)
UPDATE mx_views SET
project = ids.id 
FROM ids 
WHERE mx_views.country = ids.id_old  ;

```

## Update source

```sql

WITH ids as (
    select distinct id, id_old from mx_projects
)
UPDATE mx_sources SET
project = ids.id
FROM ids
WHERE mx_sources.country = ids.id_old;

```

## Update user last project

```sql

WITH ids as (
    select distinct to_jsonb(id) id, to_jsonb(id_old) id_old from mx_projects
)
UPDATE mx_users SET
data = jsonb_set(data,'{"user","cache","last_project"}',ids.id,true)
FROM ids
WHERE mx_users.data #> '{"user","cache","last_project"}' = ids.id_old;

```

# Update shared view
```sql
WITH arrayed as (
  select pid,
  case 
  when jsonb_typeof(data#>'{"projects"}') = 'array'
    then
    data#>'{"projects"}'
  else
    jsonb_build_array(coalesce(data#>'{"projects"}','""'))
  end as _projects
  from mx_views
),
expended as (
  select pid, jsonb_array_elements_text(_projects) as projects
  FROM arrayed
),
corrected as (
  SELECT proj.id as project, views.pid as pid from mx_projects proj, expended views where proj.id_old = views.projects
),
 aggregated as (
  select jsonb_agg(project) projects, pid from corrected group by pid
)

update mx_views set
data = jsonb_set(data,'{projects}',aggregated.projects,true)
from aggregated
where mx_views.pid = aggregated.pid;

```


# Set publishers based on people that already have published something in project

```sql
WITH pub as (
    select jsonb_agg(distinct(editor)) ids, project from mx_views group by project
)
UPDATE mx_projects SET
publishers = pub.ids
FROM pub
WHERE mx_projects.id = pub.project;
```

# Set default admins 

```sql
UPDATE mx_projects SET
admins = '[1,17,6,55]'::jsonb;
```

# Remove countries columns

```sql
alter table mx_views drop column country;
alter table mx_sources drop column country;
alter table  mx_sources alter column id type character varying(40);
```

# Create postgres view version of latest mapx view

```sql


CREATE INDEX mx_views_id_latest_idx on mx_views (id, date_modified DESC NULLS LAST);

CREATE or REPLACE view mx_views_latest as (
    WITH latest_date as (
      SELECT id, max(date_modified) date_latest
      FROM mx_views
      GROUP by id
      ),
    subviews as (
      SELECT pid 
      FROM mx_views, latest_date 
      WHERE mx_views.id = latest_date.id 
      AND date_modified = latest_date.date_latest
      )
    SELECT mx_views.* 
    FROM mx_views,subviews
    WHERE mx_views.pid = subviews.pid
    );

```

## For the temporary user (as postgres) mapxw need to be able to create role

```sql

alter user mapxw with createrole;

```


## Update titles ( solve bug where titles where missing)

```r

source('global.R')
countries <- config$countries$table
  countries_iso3 <- countries[!countries$iso3 %in% c("XXX"),c("iso3")]
languages <- as.character(config$languages$list)
  dictCountries <- config$dictionaries$countries

  titles <- lapply(countries_iso3,function(c){

      res <- lapply(languages,function(l){
          d(c,l,web=F,dict=dictCountries)
          })
      names(res)<-languages
      res <- toJSON(res,auto_unbox=T)
      res <- as.character(res)
      return(res)
      })


for(i in 1:length(countries_iso3)){

  mxDbUpdate(
      table = "mx_projects",
      id = countries_iso3[i],
      idCol = "id_old",
      column = "title",
      value = titles[[i]]
      )

}

```


## Other changes


```psql


```
