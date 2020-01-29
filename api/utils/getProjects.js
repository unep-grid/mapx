const sql = require('sql');
const pgRead = require.main.require('./db').pgRead;
const project = require('../db/models').project;
const utils = require('./utils.js');
const auth = require('./authentication.js');
const validateParamsHandler = require('./checkRouteParams.js').getParamsValidator(
  {
    expected: [
      'language',
      'role',
      'title',
      'titleFuzzy',
      'token',
      'idUser',
    ],
  }
);

module.exports.getByUser = [
  validateParamsHandler,
  auth.validateTokenHandler,
  getProjectsByUserRouteHandler,
];

function getProjectsByUserHelper(userId, lc='en', role='any', title=null, titleFuzzy=null) {
  var roleCondition = ['member', 'publisher', 'admin'].includes(role) ? role : `public OR member OR publisher OR admin`;
  var pSql = project
    .select(`id`)
    .select(`title ->> '${lc}' as title_${lc}`)
    .select(`description ->> '${lc}' as description_${lc}`)
    .select(`public`)
    .select(`allow_join`)
    .select(`members @> '[${userId}]' OR publishers @> '[${userId}]' OR admins @> '[${userId}]' AS member`)
    .select(`publishers @> '[${userId}]' OR admins @> '[${userId}]' AS publisher`)
    .select(`admins @> '[${userId}]' AS admin`)
    ;

    if (title) {
      let titleOp = 'equals';
      if (title.indexOf('*') > -1) {
        titleOp = 'ilike';
        title = title.replace(/\*/g, '%');
      }
      pSql.where(
        project.title.keyText('en')[titleOp](title).or(
          project.title.keyText(lc)[titleOp](title)
        )
      );
    }

    if (titleFuzzy) {
      pSql.where(
        sql.function('SIMILARITY')(project.title.keyText('en'), titleFuzzy).gt(0).or(
          sql.function('SIMILARITY')(project.title.keyText(lc), titleFuzzy).gt(0)
        )
      );
    }
    sqlStr = `
    WITH project_role AS (${pSql.toString()})
    SELECT * FROM project_role WHERE ${roleCondition}
    `;
  return pgRead.query(sqlStr);
}

async function getProjectsByUserRouteHandler(req, res) {
  var userId = req.params['id'];
  var rq = Object.assign({}, {
    language: 'en',
    role: 'any',
    title: null,
    titleFuzzy: null,
  }, req.query);

  // Validate parameters (userId and rp.*)
  // Todo!

  try {
    const result = await getProjectsByUserHelper(userId, rq.language, rq.role, rq.title, rq.titleFuzzy);
    res.json(result.rows);
  } catch(e) {
    console.log(e);
    res.status(500);
    res.send('Data query error!');
  }
}
