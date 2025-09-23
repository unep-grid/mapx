import { Sql } from "sql-ts";
import { pgWrite } from "#mapx/db";
import { mwSet } from "#mapx/ip";
import { isNotEmpty } from "@fxi/mx_valid";
import express from "express";
import { readJSON } from "#mapx/helpers";
import { Validator } from "#mapx/schema";
// import json still experimental
const schema = await readJSON("./schema.json", import.meta.url);

const validator = new Validator(schema);

const sql = new Sql("postgres");
/**
 * log table descriptiom
 */
const tblLogs = sql.define({
  name: "mx_logs",
  columns: [
    "date_modified",
    "side",
    "level",
    "id_log",
    "ip_user",
    "id_user",
    "id_project",
    "is_guest",
    "is_static",
    "data",
    "country_code",
  ],
});

/**
 * Middleware stack
 */
export const mwCollect = [express.json(), mwSet, mwCollectHelper];
export default { mwCollect };

/**
 * Collect
 * Handles the collection of logs, validates them, and saves them if valid.
 * Responds with appropriate HTTP status codes based on the operation result.
 */
async function mwCollectHelper(req, res) {
  try {
    const ipGeo = req?._ip_geo || {};
    const errors = await validate(req?.body?.logs);
    const hasErrors = isNotEmpty(errors);
    if (hasErrors) {
      res.status(400).json({ errors }); // Bad Request status
    } else {
      await saveLogs(req.body.logs, ipGeo);
      res.status(200).end(); // OK status
    }
  } catch (e) {
    console.error(e);
    res.status(500).end(); // Internal Server Error status
  }
}

export async function ioCollecLogs(socket, data, cb) {
  try {
    const ipGeo = socket.session?.ip_geo || {};
    const errors = await validate(data.logs);
    const hasErrors = isNotEmpty(errors);
    if (hasErrors) {
      throw new Error(errors);
    } else {
      debugger;
      await saveLogs(data.logs, ipGeo);
      cb();
    }
  } catch (e) {
    cb({
      errors: e.message,
    });
  }
}

/**
 *  Validate;
 */
async function validate(logs, client) {
  const errors = await validator.validate(logs, client);
  return errors || [];
}

/**
 * Save in DB
 */
async function saveLogs(logs, ipGeo) {
  const logsFormated = formatLogs(logs, ipGeo);
  const query = tblLogs.insert(logsFormated).toQuery();
  return pgWrite.query(query);
}
/**
 * Format : add date and ip
 * ipGeo sample
 * { ip: '192.168.65.1',
 *   country: null,
 *   country_name: null,
 *   source: 'redis'
 * }
 * log sample
 * {
 *   "date_modified": "2024-05-14T15:20:50.698Z",
 *   "id_log": "session_start",
 *   "data": {},
 *   "is_static": false,
 *   "is_guest": false,
 *   "id_user": 1,
 *   "id_project": "MX-A3M-LVK-V7S-XOT-J48",
 *   "side": "browser",
 *   "level": "USER_ACTION",
 *   "ip_user": "192.168.65.1",
 *   "country_code": "CH"
 * }
 */
function formatLogs(logs = [], ipGeo) {
  const { ip, country } = ipGeo;
  for (const l of logs) {
    l.ip_user = ip;
    l.country_code = country;
    l.date_modified = new Date(l.date_modified);
  }
  return logs;
}
