import { pgRead, pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";
import { isSourceId, isEmpty, isNotEmpty } from "@fxi/mx_valid";
import { newIdSource } from "#mapx/upload";
import {
  registerSource,
  getColumnsTypesSimple,
  withTransaction,
} from "#mapx/db_utils";

import { getSchema } from "./schema.js";
import { Validator } from "#mapx/schema";
import { getViewsBySource } from "../../view/getView.js";
import { SQLQueryBuilder } from "./sql_builder.js";

const schema = getSchema();

const validator = new Validator(schema);

const join_default = {
  id_source: "",
  columns: [],
  _prefix: "j0_", // not part of the schema
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

    const response = await handleMethod(method, config, session, socket);

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
 * @param {Object} socket - Websocket.
 * @returns {Promise<any>} - Result of the executed method.
 */
async function handleMethod(method, config, session, socket) {
  const handlers = {
    get_config_default: () => config_default,
    get_join_default: () => join_default,
    get_config: () => getJoinConfig(config),
    get_data: () => getJoinData(config),
    get_schema: () => getSchema(config?.language),
    get_count: () => getCount(config),
    get_preview: () => getPreview(config),
    validate: () => validator.validate(config),
    get_columns_missing: () => getColumnsMissingInJoin(config),
    get_columns_type: () => getColumnsType(config),
    set_config: (client) => setJoinConfig(config, client, socket),
    register: (client) => register(config, session, client),
  };

  if (!handlers[method]) {
    throw new Error(`Unsupported method ${method}`);
  }

  const useTransaction = ["set_config", "register"].includes(method);

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
  if (res.rowCount === 0) {
    return {};
  }
  return res.rows[0].data;
}

export async function getJoinConfig(configGet, client = pgRead) {
  const res = await getJoinData(configGet, client);
  const { join } = res;
  return join;
}

async function setJoinConfig(config, client = pgWrite, socket) {
  await stopIfNotValid(config, client);
  await updatePrefixConfig(config);
  await updatePgView(config, client);
  await updateJoin(config, client);
  await updateViews(config, socket);
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

async function updateViews(config, socket) {
  const views = await getViewsBySource(config.id_source);
  if (isNotEmpty(views)) {
    socket.mx_emit_ws_global("/server/spread/views/update", { views });
  }
}

async function updateJoin(config, client) {
  const result = await client.query(templates.updateJoinConfig, [
    config,
    config.id_source,
  ]);

  if (result.rowCount !== 1) {
    throw new Error(
      `Expected 1 row to be updated, but got ${result.rowCount} rows.`
    );
  }
}

async function updatePrefixConfig(config) {
  // Extracting base layer details
  const prefixes = [];
  const maxJoin = schema.properties.joins.maxItems;
  for (let i = 0; i < maxJoin; i++) {
    prefixes.push(`j${i}_`);
  }

  let j = 0;

  for (const join of config.joins) {
    join._prefix = prefixes[j++];
  }
}

async function updatePgView(config, client) {
  const sqb = new SQLQueryBuilder(config);
  const sql = sqb.createViewSQL();
  await client.query(sql);
}

async function getCount(config, client = pgRead) {
  try {
    const errors = await validator.validate(config, client);
    if (isNotEmpty(errors)) {
      return 0;
    }
    await updatePrefixConfig(config);
    const sqb = new SQLQueryBuilder(config);
    const sql = sqb.rowCountSQL();
    const res = await client.query(sql);
    if (res.rowsCount === 0) {
      return 0;
    }
    const { count } = res.rows[0];
    return count;
  } catch (e) {
    return 0;
  }
}

async function getPreview(config, client = pgRead) {
  try {
    await updatePrefixConfig(config);
    const errors = await validator.validate(config, client);
    if (isNotEmpty(errors)) {
      return null;
    }
    const sqb = new SQLQueryBuilder(config);
    const sql = sqb.firstNRowsSQL(50);
    const res = await client.query(sql);
    return res.rows;
  } catch (e) {
    return null;
  }
}


async function getColumnsMissingInJoin(joinConfig) {
  const { id_source: idSource, base, joins } = joinConfig;
  const missingColumns = [];

  if (!isSourceId(idSource)) {
    return []; // No join configuration, so no missing columns
  }

  const validation = await validator.validate(joinConfig);

  if (isNotEmpty(validation)) {
    // pre-existing errors
    return [];
  }

  const views = await getViewsBySource(idSource);

  // Extracting attributes from views and checking against join configuration
  for (const view of views) {
    const attributeNames = view?.data?.attribute?.names || [];
    const attributeName = view?.data?.attribute?.name;
    if (attributeName) {
      attributeNames.push(attributeName);
    }

    const attributes = new Set(attributeNames);
    const baseColumns = base.columns || [];

    for (const attr of attributes) {
      if (isEmpty(attr)) {
        continue;
      }

      let found = baseColumns.includes(attr);
      let j = 0;
      for (const join of joins) {
        const prefix = `j${j++}_`;
        if (!attr.startsWith(prefix)) {
          continue;
        }

        const joinColumns = join.columns || [];
        const originalAttr = attr.substring(prefix.length);
        if (!found) {
          found = joinColumns.includes(originalAttr);
        }
      }

      if (!found) {
        missingColumns.push({
          id: attr,
          view: view,
        });
      }
    }
  }

  return missingColumns;
}
