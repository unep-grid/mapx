with extent as (
  select
    extent_name,
    extent_code
  from
    epsg_extent
),
usage as (
  select
    e.extent_name,
    u.object_code
  from
    epsg_usage u,
    extent e
  where
    u.object_table_name = 'epsg_coordinatereferencesystem'
    and e.extent_code = u.extent_code
),
srid as(
  select
    u.extent_name,
    c.coord_ref_sys_code,
    coord_ref_sys_name
  from
    epsg_coordinatereferencesystem c,
    usage u
  where
    u.object_code = c.coord_ref_sys_code
)
select
  json_agg(
    json_build_object(
      'srid',
      s.coord_ref_sys_code,
      'name',
      s.coord_ref_sys_name,
      'region',
      s.extent_name
    )
  )
from
  srid s;
