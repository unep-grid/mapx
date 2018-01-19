copy ( with stories_subset as (
    select id as id_latest, max(date_modified) as date_latest from mx_views where type = 'sm' group by id
  ),
  story_latest as (
    select date_modified, target, id as id_story, editor, data#>>'{"title","en"}' as title_en from mx_views inner join stories_subset on ( id = stories_subset.id_latest AND date_modified = stories_subset.date_latest)
  ),
  story_latest_editor as (
    select distinct(editor) as id_editor from story_latest
  ),
  users as (
    select email, id from mx_users, story_latest_editor where id = id_editor
  )
  select date_modified, users.email, target, story_latest.title_en, story_latest.id_story from story_latest,users  where users.id = story_latest.editor
)  To '/tmp/stories_by_user.csv' With CSV DELIMITER ',';

