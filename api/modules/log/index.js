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
