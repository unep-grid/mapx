WITH
  v_latest AS (
    SELECT
      *
    FROM
      mx_views_latest
    WHERE
      id = $1
    LIMIT
      1
  ),
  v_last_editor AS (
    SELECT
      editor
    FROM
      v_latest
  ),
  v_date_created AS (
    SELECT
      date_modified
    FROM
      mx_views
    WHERE
      id = $1
    ORDER BY
      date_modified ASC
    LIMIT
      1
  ),
  v_log AS (
    SELECT
      pid,
      ip_user,
      id_user,
      is_guest,
      date_modified
    FROM
      mx_logs
    WHERE
      data #>> '{"id_view"}' = $1
      AND id_log = 'view_add'
      AND date_modified > (CURRENT_DATE - $2::integer)
  ),
  v_log_ip_country AS (
    SELECT
      v.pid,
      v.id_user,
      v.is_guest,
      coalesce(m.country_name, 'unknown') country_name,
      m.country_iso_code country
    FROM
      v_log v
      LEFT JOIN mx_ip m ON v.ip_user <<= m.network
    WHERE
      v.date_modified > (CURRENT_DATE - 365::integer)
  ),
  v_stat_add_count_by_country AS (
    SELECT
      country,
      country_name,
      COUNT(*)
    FROM
      v_log_ip_country
    GROUP BY
      country,
      country_name
  ),
  v_stat_add_count_by_country_order AS (
    SELECT
      *
    FROM
      v_stat_add_count_by_country
    ORDER BY
      count desc
  ),
  v_stat_add_count_by_country_table AS (
    SELECT
      coalesce(json_agg(row_to_json(t)), '[]') tbl
    FROM
      v_stat_add_count_by_country_order t
  ),
  v_stat_add_count_by_users AS (
    SELECT
      COUNT(pid)
    FROM
      v_log
    WHERE
      NOT is_guest
  ),
  v_stat_add_count_by_guests AS (
    SELECT
      COUNT(pid)
    FROM
      v_log
    WHERE
      is_guest
  ),
  v_stat_add_count_by_distinct_users AS (
    SELECT
      COUNT(DISTINCT id_user)
    FROM
      v_log
    WHERE
      NOT is_guest
  ),
  v_changes_editors AS (
    SELECT
      editor,
      COUNT(pid) n_changes
    FROM
      mx_views
    WHERE
      id = $1
    GROUP BY
      editor
  ),
  v_stats AS (
    SELECT
      json_build_object(
        'id',
        to_json(vl.id),
        'stat_n_add',
        to_json(vs_add_by_users.count + vs_add_by_guests.count),
        'stat_n_add_by_guests',
        to_json(vs_add_by_guests.count),
        'stat_n_add_by_users',
        to_json(vs_add_by_users.count),
        'stat_n_add_by_distinct_users',
        to_json(vs_add_by_distinct_users.count),
        'stat_n_add_by_country',
        vs_add_by_country.tbl
      ) AS stats
    FROM
      v_latest vl,
      v_date_created vc,
      v_stat_add_count_by_guests vs_add_by_guests,
      v_stat_add_count_by_users vs_add_by_users,
      v_stat_add_count_by_distinct_users vs_add_by_distinct_users,
      v_stat_add_count_by_country_table vs_add_by_country
  )
  
SELECT
  *
FROM
  v_stats;