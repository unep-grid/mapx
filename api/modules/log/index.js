import { Sql } from "sql-ts";
import Ajv from "ajv";
import { pgWrite } from "#mapx/db";
import { mwSet } from "#mapx/ip";
import { apiLogs } from "#mapx/schema";
import { isEmpty, isArray } from "@fxi/mx_valid";
import express from "express";
const sql = new Sql("postgres");
const v = new Ajv();
const check = v.compile(apiLogs);
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
  ],
});

/**
 * Middleware stack
 */
export const mwCollect = [mwSet, express.json(), mwCollectHelper];
export default { mwCollect };

/**
 * Collect
 */
async function mwCollectHelper(req, res) {
  try {
    const ipGeo = req?._ip_geo || {};
    const isValid = validateLogs(req?.body?.logs);
    if (isValid) {
      await saveLogs(req.body.logs, ipGeo);
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
  if (isEmpty(logs) || !isArray(logs)) {
    return false;
  }
  return logs.reduce((a, log) => (!a ? a : check(log)), true);
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
 */
function formatLogs(logs, ipGeo) {
  logs = logs || [];
  for (const l of logs) {
    l.ip_user = ipGeo.ip;
    l.date_modified = new Date(l.date_modified);
    if (l.id_log === "session_start") {
      l.data = {
        ...ipGeo,
        ...l.data,
      };
    }
  }
  return logs;
}
