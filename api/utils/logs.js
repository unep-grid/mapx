const bodyParser = require('body-parser');
const setIpGeo = require('./utils.js').ip.set;
const Ajv = require('ajv');
const sql = require('sql');
const schemaLogs = require('../schemas').apiLogs;
const v = new Ajv();
const check = v.compile(schemaLogs);
const pgWrite = require.main.require('./db').pgWrite;

/**
 * log table descriptiom
 */
const tblLogs = sql.define({
  name: 'mx_logs',
  columns: [
    'date_modified',
    'side',
    'level',
    'id_log',
    'ip_user',
    'id_user',
    'id_project',
    'is_guest',
    'data'
  ]
});

/**
 * Middleware stack
 */
exports.collect = [setIpGeo, bodyParser.json(), collect];

/**
 * Collect
 */
function collect(req, res) {
  try {
    const ipGeo = req.ipGeo;
    const isValid = validateLogs(req.body.logs);
    if (isValid) {
      saveLogs(req.body.logs, ipGeo);
      res.end();
    } else {
      res.send(isValid);
    }
  } catch (e) {
    console.error(e);
    res.end();
  }
}

/**
 * Validate each logs (ajv does not validate object in array);
 */
function validateLogs(logs) {
  let result = logs.reduce((a, log) => {
    return a !== true ? a : check(log);
  }, true);
  return result;
}
/**
* Save in DB
*/
function saveLogs(logs, ipGeo) {
  const logsFormated = formatLogs(logs, ipGeo);
  const query = tblLogs.insert(logsFormated).toQuery();
  pgWrite.query(query);
}
/**
 * Format : add date and ip
 */
function formatLogs(logs, ipGeo) {
  logs = logs || [];
  logs.forEach((l) => {
    l.ip_user = ipGeo.ip;
    l.date_modified = new Date(l.date_modified);
    if(l.id_log === 'session_start'){
      l.data = Object.assign({},ipGeo,l.data);
    }
  });
  return logs;
}


