/*
* mx_users : table of user 
*/

DROP TABLE IF EXISTS mx_users ;

create table mx_users (
  pid serial PRIMARY KEY,
  id serial unique,
  username citext unique,
  email citext unique,
  key text,
  validated boolean,
  hidden boolean,
  date_validated timestamp,
  date_hidden timestamp,
  date_last_visit timestamp,
  data jsonb
);

ALTER TABLE mx_users OWNER TO mapxw;



DROP TABLE IF EXISTS mx_config ;

create table mx_config (
  pid serial PRIMARY KEY,
  key citext unique,
  data jsonb,
  date_modified timestamp with time zone default current_timestamp
);

ALTER TABLE mx_config OWNER TO mapxw;


create table if not exists mx_views (
  pid serial PRIMARY KEY,
  id character varying(20) not null,
  country character varying(3),
  editor integer,
  target jsonb,
  date_modified timestamp with time zone,
  data jsonb,
  type character varying(10)
);


CREATE INDEX ON mx_views (pid);
CREATE INDEX ON mx_views (date_modified);
CREATE INDEX ON mx_views (editor);
CREATE INDEX ON mx_views (editors);
CREATE INDEX ON mx_views (id);
CREATE INDEX ON mx_views (id, date_modified DESC NULLS LAST);
CREATE INDEX ON mx_views (project);
CREATE INDEX ON mx_views (readers);

-- CREATE INDEX on mx_views USING GIN (data);
ALTER TABLE mx_views OWNER TO mapxw;

create table if not exists mx_sources (
  pid serial PRIMARY KEY,
  id character varying(31) unique not null,
  country character varying(3),
  editor integer,
  target jsonb,
  date_modified timestamp with time zone,
  data jsonb,
  type character varying(10)
);

ALTER TABLE mx_sources OWNER TO mapxw;

