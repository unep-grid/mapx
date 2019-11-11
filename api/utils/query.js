const pgCustom = require.main.require("./db").pgCustom;
const decrypt = require("./db.js").decrypt;
const utils = require('./utils.js');
const { Parser } = require('node-sql-parser');

/**
 * Set middleware chain for encrypted query and non-encrypted query
 */
exports.get = [decryptQuery, validateSql, querySql];

/**
* Decrypts query if needed
*/
function decryptQuery(req, res, next) {
  var promDecrypt;
  if (req.query.data) {
    promDecrypt = decrypt(req.query.data)
      .then(r => {
        req.query.sql = r.data.sql;
        next();
      });
  } else {
    promDecrypt = new Promise(() => {
      next();
    });
  }
  return promDecrypt
    .catch(function (err) {
      console.error(err);
      res.status(500).send('500 Bad request');
    });
}

/**
* Validates SQL query
* NOTE: Non-SELECT queries are blocked by PostgreSQL
*/
function validateSql(req, res, next) {
  const parser = new Parser();
  const opt = {
    database: 'PostgreSQL'
  };

  const messages = [];
  var ast, sqlParsed;

  const sql = req.query.sql;
  if (!sql) {
    messages.push('SQL argument must be provided.');
  }

  if (messages.length === 0) {
    try {
      ast = parser.astify(sql, opt);
    } catch (e) {
      console.error(e.message);
      messages.push('The SQL query could not be parsed.');
    }
  }

  if (messages.length === 0) {
    if (Array.isArray(ast) === true) {
      messages.push('Only one query can be executed at a time.');
    }

    var hasGeom = utils.findValues(ast, 'column').indexOf('geom') > -1;
    if (hasGeom === true) {
      messages.push('The geom column cannot be exported or used by functions.');
    }

    var hasStar = utils.findValues(ast, 'columns').indexOf('*') > -1
      || utils.findValues(ast, 'column').indexOf('*') > -1
      || utils.findValues(ast, 'value').indexOf('*') > -1;
    if (hasStar === true) {
      messages.push('Asterisk cannot be used to select all columns or by functions.');
    }

    try {
      sqlParsed = parser.sqlify(ast, opt);
    } catch (e) {
      console.error(e.message);
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
  pgCustom.query(req.sqlQuery)
    .then(r => {
      return res.send(r.rows);
    })
    .catch(function (err) {
      console.error(err);
      res.status(500).send('500 Bad request');
    });
}
