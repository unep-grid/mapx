const pgRead = require.main.require("./db").pgRead;
const pgCustom = require.main.require("./db").pgCustom;
const decrypt = require("./db.js").decrypt;
const utils = require('./utils.js');
const { Parser } = require('node-sql-parser');


/**
* Get a custom encrypted request
* data : {"type":"query","validUntil":{},"data":{"sql":"select count(*) from mx_uga_vector_9sfi1_5ol25_dtgas"}}
*/
exports.get = function (req, res) {
  var encryptedQuery = req.query.data;
  decrypt(encryptedQuery)
    .then(result => {
      var data = result.data;
      if (!data || !data.sql) throw new Error('Empty query');
      return pgRead.query(data.sql);
    })
    .then(function (sqlRes) {
      res.send(sqlRes.rows);
    }).catch(function (err) {
      res.status(403).send("Bad request " + err);
    });
};

/**
* Get a custom non-encrypted request
* NOTE: Non-SELECT queries are blocked by PostgreSQL
*/
exports.getCustom = function (req, res) {
  const parser = new Parser();
  const opt = {
    database: 'PostgresQL'
  }
  return new Promise((resolve) => {
    const sql = req.query.sql;
    if (!sql) {
      throw new Error('SQL argument must be provided.');
    }

    const ast = parser.astify(sql, opt);
    if (Array.isArray(ast) === true) {
      throw new Error('only one query can be executed at a time.');
    }

    var hasGeom = utils.findValues(ast, 'column').indexOf('geom') > -1
    if (hasGeom === true) {
      throw new Error('The geom column cannot be exported or used by functions.');
    }

    var hasStar = utils.findValues(ast, 'columns').indexOf('*') > -1
      || utils.findValues(ast, 'value').indexOf('*') > -1;
    if (hasStar === true) {
      throw new Error('Asterisk cannot be used to select all columns or by functions.');
    }

    const sqlParsed = parser.sqlify(ast, opt);

    resolve({
      text: sqlParsed
    });

  })
    .then((query) => {
      /**
      * Execute request
      */
      return pgCustom.query(query);
    }).then((r) => {
      /**
      * Send raw result
      */
      return res.send(r.rows);
    })
    .catch(function (err) {
      console.log(err);
      res.status(400).send('400 Bad request');
    });
};
