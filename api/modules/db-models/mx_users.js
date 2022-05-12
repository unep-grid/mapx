import {Sql} from 'sql-ts';
const sql = new Sql('postgres');

export const user = sql.define({
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
