import { isArray, isEmpty, isNotEmpty, isSourceId } from "@fxi/mx_valid";
import { pgRead, pgWrite } from "#mapx/db";
import { getSourceData } from "#mapx/source";
import {
  getColumnsTypesSimple,
  getSourceType,
  registerSource,
  removeSource,
} from "#mapx/db_utils";
import { templates } from "#mapx/template";
import { newIdSource } from "#mapx/upload";
import { config_default } from "./defaults.js";
import { validator } from "./validator.js";
import { getViewsBySource } from "#mapx/view";
import { SQLQueryBuilder } from "./sql_builder.js";

/**
 * Get join data for a source
 */
export async function getSourceJoinData(idSource, client = pgRead) {
  const { join } = await getSourceData(idSource, client);
  return join || {};
}

/**
 * Get vector layers from a join object
 */
export async function getSourceJoinLayers(idSource, client = pgRead) {
  const { base, joins } = await getSourceJoinData(idSource, client);
  const out = new Set();
  out.add(base.id_source);
  for (const join of joins || []) {
    const type = await getSourceType(join.id_source);
    if (type === "vector") {
      out.add(join.id_source);
    }
  }
  return Array.from(out);
}

/**
 * Helper used in schema mx_validate
 */
export async function validateJoins(config, client = pgRead) {
  try {
    const joins = config.joins;

    for (const join of joins) {
      const query = templates.getSourceJoinTypeCheck;

      const res = await client.query(query, [
        config.base.id_source,
        join.column_base,
        join.id_source,
        join.column_join,
      ]);

      if (res.rowCount === 0) {
        return false; // No matching columns found
      }

      if (res.rows[0].base_type !== res.rows[0].join_type) {
        return false; // Incompatible types
      }
    }

    return true; // All joins are compatible
  } catch (error) {
    console.error(error);
    return false; // Return false in case of any error
  }
}

export async function register(config, session, client) {
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

export async function unregister(config, session, client) {
  const { id_source } = config;
  const id_user = session.user_id;
  const removed = await removeSource(id_source, id_user, client);
  return removed;
}

export async function getJoinData(config, client = pgRead) {
  const { id_source } = config;
  return getSourceData(id_source, client);
}

export async function stopIfNotValid(config, client) {
  const errors = await validator.validate(config, client);
  if (isNotEmpty(errors)) {
    throw new Error(msg(`invalid config : ${JSON.stringify(errors, 0, 2)}`));
  }
}
export async function getJoinConfig(configGet, client = pgRead) {
  const { id_source } = configGet;
  return getSourceJoinData(id_source, client);
}

export async function setJoinConfig(config, client = pgWrite, socket) {
  await stopIfNotValid(config, client);
  await updatePrefixConfig(config);
  await updatePgView(config, client);
  await updateJoin(config, client);
  await updateViews(config, socket);
  return true;
}

export async function getColumnsType(config) {
  // if no idAttr => all
  const { idSource, idAttr, idAttrExclude } = config;
  if (!isSourceId(idSource)) {
    throw new Error(msg("Missing Source ID"));
  }
  return getColumnsTypesSimple(idSource, idAttr, idAttrExclude);
}

export function msg(txt) {
  return `Join (server): ${txt}`;
}

export async function updateViews(config, socket) {
  const views = await getViewsBySource(config.id_source);
  if (isEmpty(views)) {
    return;
  }
  return emitUpdateViews(views, socket);
}

export async function emitUpdateViews(views, socket) {
  await socket.mx_emit_ws_global("/server/spread/views/update", { views });
  return true;
}

export async function updateJoin(config, client) {
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

export async function updatePrefixConfig(config) {
  let j = 0;
  for (const join of config.joins) {
    join._prefix = colPrefix(j++);
  }
}

export function colPrefix(n) {
  return `j${n}_`;
}

export async function updatePgView(config, client) {
  const sqb = new SQLQueryBuilder(config);
  const sql = sqb.createViewSQL();
  await client.query(sql);
}

export async function getCount(config, client = pgRead) {
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

export async function getPreview(config, client = pgRead) {
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

export async function getColumnsMissingInJoin(joinConfig) {
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
    let attributeNames = view?.data?.attribute?.names || [];
    let attributeName = view?.data?.attribute?.name;
    if (!isArray(attributeNames)) {
      attributeNames = [attributeNames];
    }
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
        const prefix = colPrefix(j++);

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

/**
 * Updates the name of a column in a join and related views.
 *
 * @param {string} idSourceUpdate The ID of the source with updated colums.
 * @param {string} oldColumnName The old column name to be updated.
 * @param {string} newColumnName The new column name to replace with.
 * @param {pgClient} client PostgreSQL client
 * @returns {Promise<array>} Array of updates
 */
export async function updateJoinColumnsNames(
  idSourceUpdate,
  oldColumnName,
  newColumnName,
  client = pgRead
) {
  const updates = [];
  const query = templates.getSourceJoinDataUsingSourceId;

  const { rows: sources, rowCount } = await client.query(query, [
    idSourceUpdate,
  ]);

  if (rowCount === 0) {
    return [];
  }

  for (const source of sources) {
    const { data, id: idSourceJoin } = source;
    const { join: joinConfig } = data;

    if (joinConfig.id_source !== idSourceJoin) {
      continue;
    }

    const { joins, base } = joinConfig;

    if (base.id_source === idSourceUpdate) {
      const baseColumnIndex = base.columns.indexOf(oldColumnName);
      if (baseColumnIndex) {
        updates.push({
          id_source: idSourceJoin,
          old_column: oldColumnName,
          new_column: newColumnName,
        });
      }
    }

    for (const join of joins) {
      if (join.id_source !== idSourceUpdate) {
        continue;
      }

      const columnIndex = join.columns.indexOf(oldColumnName);

      if (columnIndex === -1) {
        continue;
      }

      join.columns[columnIndex] = newColumnName;

      const oldColumnNamePrefix = `${join._prefix}${oldColumnName}`;
      const newColumnNamePrefix = `${join._prefix}${newColumnName}`;

      updates.push({
        id_source: idSourceJoin,
        old_column: oldColumnNamePrefix,
        new_column: newColumnNamePrefix,
      });
    }

    await stopIfNotValid(joinConfig, client);
    await updatePgView(joinConfig, client);
    await updateJoin(joinConfig, client);
  }

  return updates;
}
