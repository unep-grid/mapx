const sql = require('node-sql-2');
sql.setDialect('postgres');

const user = sql.define({
  name: 'mx_users',
  columns: [
    'pid',
    'id',
    'username',
    'email',
    'key',
    'validated',
    'hidden',
    'date_validated',
    'date_hidden',
    'date_last_visit',
    'data'
  ]
});

user.default = {
  validated: 't',
  hidden: 'f',
  date_validated: 'now()',
  date_hidden: 'now()',
  date_last_visit: 'now()',
  data: '{"user": {}}'
};

const project = sql.define({
  name: 'mx_projects',
  columns: [
    'pid',
    'id',
    'id_old',
    'title',
    'description',
    'active',
    'public',
    'admins',
    'members',
    'publishers',
    'map_position',
    'countries',
    'creator',
    'date_created',
    'date_modified',
    'views_external',
    'alias',
    'allow_join',
    'contacts',
    'states_views'
  ]
});
project.default = {
  active: 't',
  public: 't',
  admins: '[]',
  members: '[]',
  publishers: '[]',
  map_position: '{"z": 2, "lat": 0, "lng": 0}',
  countries: '[]',
  creator: 1,
  date_created: 'now()',
  date_modified: 'now()',
  views_external: '[]',
  alias: '',
  allow_join: 't',
  contacts: '[]',
  states_views: '[]'
};
module.exports = {
  user,
  project
};
