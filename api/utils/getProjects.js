const sql = require('sql');
const pgRead = require.main.require('./db').pgRead;
const project = require('../db/models').project;
const auth = require('./authentication.js');
const validateParamsHandler = require('./checkRouteParams.js').getParamsValidator(
  {
    expected: [
      'language',
      'role',
      'title',
      'titlePrefix',
      'titleFuzzy',
      'token',
      'idUser'
    ]
  }
);

module.exports.getByUser = [
  validateParamsHandler,
  auth.validateTokenHandler,
  getProjectsByUserRouteHandler
];

function getProjectsByUserHelper(
  idUser,
  lc = 'en',
  role = 'any',
  title = null,
  titlePrefix = null,
  titleFuzzy = null
) {
  var roleCondition = ['member', 'publisher', 'admin'].includes(role)
    ? role
    : `public OR member OR publisher OR admin`;
  var pSql = project
    .select(`id`)
    .select(`title ->> '${lc}' as title`)
    .select(`description ->> '${lc}' as description`)
    .select(`title ->> 'en' as title_en`)
    .select(`description ->> 'en' as description_en`)
    .select(`public`)
    .select(`allow_join`)
    .select(
      `members @> '[${idUser}]' OR publishers @> '[${idUser}]' OR admins @> '[${idUser}]' AS member`
    )
    .select(
      `publishers @> '[${idUser}]' OR admins @> '[${idUser}]' AS publisher`
    )
    .select(`admins @> '[${idUser}]' AS admin`);
  if (title) {
    pSql.where(
      project.title
        .keyText('en')
        .equals(title)
        .or(project.title.keyText(lc).equals(title))
    );
  }

  if (titlePrefix) {
    pSql.where(
      project.title
        .keyText('en')
        .ilike(`${titlePrefix}%`)
        .or(project.title.keyText(lc).ilike(`${titlePrefix}%`))
    );
  }

  if (titleFuzzy) {
    pSql.where(
      sql
        .function('SIMILARITY')(project.title.keyText('en'), titleFuzzy)
        .gt(0)
        .or(
          sql
            .function('SIMILARITY')(project.title.keyText(lc), titleFuzzy)
            .gt(0)
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
  var idUser = req.query.idUser;
  var rq = Object.assign(
    {},
    {
      language: 'en',
      role: 'any',
      title: null,
      titlePrefix: null,
      titleFuzzy: null
    },
    req.query
  );

  try {
    const result = await getProjectsByUserHelper(
      idUser,
      rq.language,
      rq.role,
      rq.title,
      rq.titlePrefix,
      rq.titleFuzzy
    );

    /**
    * As it's not done in sql, set title default if empty
    */
    result.rows.forEach((r) => {
      if (!r.title) {
        r.title = r.title_en;
      }
    });

    res.json(result.rows);
  } catch (e) {
    console.log(e);
    res.status(500);
    res.send('Data query error!');
  }
}
