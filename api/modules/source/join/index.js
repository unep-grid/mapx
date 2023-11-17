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
import { validator } from "./validate.js";

//schema in api/modules/source/join/schema.json
const config_default = {
  version: "1",
  id_source: "",
  title: {
    en: "",
  },
  description: {
    en: "",
  },
  base: {
    id_source: "",
    columns: [],
    prefix: "a_",
  },
  joins: [
    {
      id_source: "",
      columns: [],
      prefix: "b_",
      type: "INNER",
      column_join: "",
      column_base: "",
    },
  ],
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
    config_default: () => config_default,
    get: () => getJoinConfig(config),
    validate: () => validate(config),
    attributes: () => getAtributes(config),
    set: (client) => setJoinConfig(config, client),
    create: (client) => create(config, session, client),
  };

  if (!handlers[method]) {
    throw new Error(`Unsupported method ${method}`);
  }

  const useTransaction = ["set", "create"].includes(method);

  if (useTransaction) {
    return withTransaction((client) => handlers[method](client));
  } else {
    return handlers[method]();
  }
}

async function create(config, session, client) {
  const id_source = newIdSource();

  config.id_source = id_source;

  const title = config.title.en || `New Join ${new Date().toLocaleString()}`;
  const id_user = session.user_id;
  const id_project = session.project_id;
  const type = "join";
  const enable_download = false;
  const enable_wms = false;
  const ok = await registerSource(
    id_source,
    id_user,
    id_project,
    title,
    type,
    enable_download,
    enable_wms,
    client
  );
  if (!ok) {
    throw new Error(msg("Creation failed"));
  }
  await updateJoin(config, client);

  return config;
}

// returns array of errors
async function validate(config, client) {
  const errors = await validator.checkErrors(config, client);
  return errors || [];
}

async function stopIfNotValid(config, client) {
  const errors = await validate(config, client);
  if (isNotEmpty(errors)) {
    throw new Error(msg(`invalid config : ${JSON.stringify(errors, 0, 2)}`));
  }
}

async function getJoinData(config, client = pgRead) {
  const { id_source } = config;
  const res = await client.query(templates.getSourceJoinData, [id_source]);
  if (res.rowCount) {
    return res.rows[0].config;
  } else {
    return {};
  }
}

async function getJoinConfig(configGet, client = pgRead) {
  const config = await getJoinData(configGet, client);
  return Object.assign(config_default, config);
}

async function setJoinConfig(config, client = pgWrite) {
  await stopIfNotValid(config, client);
  await updatePgView(config, client);
  await updateJoin(config, client);
  return true;
}

async function getAtributes(config) {
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

  // Execute the SQL
  await client.query(sql);
}
