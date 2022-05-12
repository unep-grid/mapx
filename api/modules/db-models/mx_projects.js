import {Sql} from 'sql-ts';
const sql = new Sql('postgres');

export const project = sql.define({
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
  allow_join: 'f',
  contacts: '[]',
  states_views: '[]'
};

