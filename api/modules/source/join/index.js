import { pgRead, pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";
import { isSourceId, isNotEmpty } from "@fxi/mx_valid";
import { newIdSource } from "#mapx/upload";
import {
  columnExists,
  registerSource,
  getColumnsTypesSimple,
  withTransaction,
} from "#mapx/db_utils";

import { schema } from "./schema.js";
import { Validator } from "#mapx/schema";

const validator = new Validator(schema);

const join_default = {
  id_source: "",
  columns: [],
  prefix: "b_",
  type: "INNER",
  column_join: "",
  column_base: "",
};
const config_default = {
  version: "1",
  id_source: "",
  base: {
    id_source: "",
    columns: [],
    prefix: "a_",
  },
  joins: [join_default],
};
export async function ioSourceJoin(socket, data, cb) {
  const session = socket.session;

  try {
    if (!session) {
      throw new Error(msg("No Session"));
    }

    if (!session.user_authenticated || !session.user_roles.publisher) {
      throw new Error(msg("Unauthorized"));
    }

    const { method, config } = data;

    const response = await handleMethod(method, config, session);

    cb(response);
  } catch (e) {
    console.error(e);
    await socket.notifyInfoError({
      message: e.message,
    });
  }
}

/**
 * Handles different methods for join configuration.
 *
 * @param {string} method - The method to execute.
 * @param {Object} config - Configuration.
 * @param {Object} session - Session information.
 * @returns {Promise<any>} - Result of the executed method.
 */
async function handleMethod(method, config, session) {
  const handlers = {
    get_config_default: () => config_default,
    get_join_default: () => join_default,
    get_config: () => getJoinConfig(config),
    get_data: () => getJoinData(config),
    get_schema: () => schema,
    validate: () => validator.validate(config),
    get_columns_type: () => getColumnsType(config),
    set_config: (client) => setJoinConfig(config, client),
    register: (client) => register(config, session, client),
  };

  if (!handlers[method]) {
    throw new Error(`Unsupported method ${method}`);
  }

  const useTransaction = ["set", "register"].includes(method);

  if (useTransaction) {
    return withTransaction((client) => handlers[method](client));
  } else {
    return handlers[method]();
  }
}

async function register(config, session, client) {
  const id_source = newIdSource();
  const { title, language } = config;
  const id_user = session.user_id;
  const id_project = session.project_id;
  const type = "join";
  const enable_download = false;
  const enable_wms = false;

  const ok = await registerSource(
    {
      idSource: id_source,
      idUser: id_user,
      idProject: id_project,
      title,
      type,
      enable_download,
      enable_wms,
      language,
    },
    client
  );

  if (!ok) {
    throw new Error(msg("Creation failed"));
  }

  const newJoin = Object.assign({}, config_default, { id_source });

  await updateJoin(newJoin, client);

  return newJoin;
}

async function stopIfNotValid(config, client) {
  const errors = await validator.validate(config, client);
  if (isNotEmpty(errors)) {
    throw new Error(msg(`invalid config : ${JSON.stringify(errors, 0, 2)}`));
  }
}

async function getJoinData(config, client = pgRead) {
  const { id_source } = config;
  const res = await client.query(templates.getSourceJoinData, [id_source]);
  if (res.rowCount) {
    return res.rows[0].data;
  } else {
    return {};
  }
}

async function getJoinConfig(configGet, client = pgRead) {
  const { config } = await getJoinData(configGet, client);
  return Object.assign(config_default, config);
}

async function setJoinConfig(config, client = pgWrite) {
  await stopIfNotValid(config, client);

  await updatePgView(config, client);
  await updateJoin(config, client);
  return true;
}

async function getColumnsType(config) {
  // if no idAttr => all
  const { idSource, idAttr, idAttrExclude } = config;
  if (!isSourceId(idSource)) {
    throw new Error(msg("Missing Source ID"));
  }
  return getColumnsTypesSimple(idSource, idAttr, idAttrExclude);
}

function msg(txt) {
  return `Join (server): ${txt}`;
}

async function updateJoin(config, client) {
  const result = await client.query(
    `
    UPDATE mx_sources
    SET data = jsonb_set(data,'{join}',$1::jsonb,true)
    WHERE id = $2
    `,
    [config, config.id_source]
  );

  if (result.rowCount !== 1) {
    throw new Error(
      `Expected 1 row to be updated, but got ${result.rowCount} rows.`
    );
  }
}

async function updatePgView(config, client) {
  const viewName = config.id_source;
  const basePrefix = config.base.prefix;
  const baseSource = config.base.id_source;
  const baseHasGeom = await columnExists("geom", baseSource, client);
  const mainColumns = ["gid"];
  if (baseHasGeom) {
    mainColumns.push("geom");
  }

  /*
   * Prepare columns
   */
  const selectColumns = [];

  // main columns
  selectColumns.push(...mainColumns.map((col) => `${basePrefix}."${col}"`));

  // columns with alias
  selectColumns.push(
    ...config.base.columns.map(
      (col) => `${basePrefix}."${col.trim()}" AS "${basePrefix}_${col.trim()}"`
    )
  );

  /*
   * Join clause
   */
  const joinClause = [];
  for (const join of config.joins) {
    joinClause.push(`
        ${join.type} JOIN ${join.id_source} 
        ON ${basePrefix}."${join.column_target}" =
        ${join.prefix}."${join.column_source}" 
      `);

    // Add join columns to SELECT with join prefix
    selectColumns.push(
      ...join.columns.map(
        (col) => `${join.prefix}."${col}" AS "${join.prefix}_${col}"`
      )
    );
  }

  // Construct the SQL for view
  const sql = `
      CREATE OR REPLACE VIEW ${viewName} AS 
      SELECT ${selectColumns.join(",")} 
      FROM ${baseSource} ${basePrefix} ${joinClause.join(" ")}
    `;

  debugger;

  // Execute the SQL
  await client.query(sql);
}
