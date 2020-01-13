const pgRead = require.main.require('./db').pgRead;
const project = require('../db/models').project;
const utils = require('./utils.js');
const auth = require('./authentication.js');

module.exports.getByUser = [
  // auth.validateTokenHandler,
  getProjectsByUserRouteHandler,
];

function getProjectsByUserHelper(userId, lc='en', role='any') {
  var roleCondition = ['member', 'publisher', 'admin'].includes(role) ? role : `public OR member OR publisher OR admin`;
  var sql = project
    .select(`id`)
    .select(`title ->> '${lc}' as title_${lc}`)
    .select(`description ->> '${lc}' as description_${lc}`)
    .select(`public`)
    .select(`allow_join`)
    .select(`members @> '[${userId}]' OR publishers @> '[${userId}]' OR admins @> '[${userId}]' AS member`)
    .select(`publishers @> '[${userId}]' OR admins @> '[${userId}]' AS publisher`)
    .select(`admins @> '[${userId}]' AS admin`)
    .where(`members @> '[${userId}]'`)
    .or(`publishers @> '[${userId}]'`)
    .or(`admins @> '[${userId}]'`)
    ;

    sqlStr = `
    WITH project_role AS (${sql.toString()})
    SELECT * FROM project_role WHERE ${roleCondition}
    `;
  return pgRead.query(sqlStr);
}

async function getProjectsByUserRouteHandler(req, res) {
  var userId = req.params['id'];
  var rq = Object.assign({}, {
    language: 'en',
    role: 'any',
  }, req.query);

  // Validate parameters (userId and rp.*)
  // Todo!

  try {
    const result = await getProjectsByUserHelper(userId, rq.language, rq.role);
    res.json(result.rows);
  } catch(e) {
    console.log(e);
    res.status(500);
    res.send('Data query error!');
  }
}
