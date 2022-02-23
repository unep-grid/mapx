import {pgCustom} from '#mapx/db';
import {decrypt} from '#mapx/db-utils';
import pkgSqlParser from 'node-sql-parser';
import {findValues} from '#mapx/helpers';

const {Parser} = pkgSqlParser;

/**
 * Set middleware chain for encrypted query and non-encrypted query
 */
const mwGet = [decryptQuery, validateSql, querySql];

export default {mwGet};

/**
 * Decrypts query if needed
 */
export async function decryptQuery(req, res, next) {
  try {
    if (req.query.data) {
      const result = await decrypt(req.query.data);
      req.query.sql = result.data.sql;
      next();
    } else {
      next();
    }
  } catch {
    res.status(500).send('500 Bad request');
  }
}

/**
 * Validates SQL query
 * NOTE: Non-SELECT queries are blocked by PostgreSQL
 */
export function validateSql(req, res, next) {
  const parser = new Parser();
  const opt = {
    database: 'PostgreSQL'
  };

  const messages = [];
  var ast;
  var sqlParsed;

  const {sql} = req.query;
  if (!sql) {
    messages.push('SQL argument must be provided.');
  }

  if (messages.length === 0) {
    try {
      ast = parser.astify(sql, opt);
    } catch {
      messages.push('The SQL query could not be parsed.');
    }
  }

  if (messages.length === 0) {
    if (Array.isArray(ast)) {
      messages.push('Only one query can be executed at a time.');
    }

    var hasGeom = findValues(ast, 'column').indexOf('geom') > -1;
    if (hasGeom) {
      messages.push('The geom column cannot be exported or used by functions.');
    }

    var hasStar =
      findValues(ast, 'columns').indexOf('*') > -1 ||
      findValues(ast, 'column').indexOf('*') > -1 ||
      findValues(ast, 'value').indexOf('*') > -1;
    if (hasStar) {
      messages.push(
        'Asterisk cannot be used to select all columns or by functions.'
      );
    }

    try {
      sqlParsed = parser.sqlify(ast, opt);
    } catch {
      messages.push('The AST object could not be parsed.');
    }
  }

  if (messages.length === 0) {
    req.sqlQuery = sqlParsed;
    next();
  } else {
    res.send({
      type: 'error',
      msg: messages
    });
  }
}

/**
 * Executes query and sends raw result
 */
function querySql(req, res) {
  pgCustom
    .query(req.sqlQuery)
    .then((r) => {
      return res.send(r.rows);
    })
    .catch(function(err) {
      console.error(err);
      res.status(500).send('500 Bad request');
    });
}
