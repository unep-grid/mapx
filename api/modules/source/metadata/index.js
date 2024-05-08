import { pgRead } from "#mapx/db";
import { parseTemplate } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { isSourceId, isNotEmpty } from "@fxi/mx_valid";

/**
 * WS handler for source attraibutes aliases
 */
export async function ioSourceAttributesAlias(socket, data, cb) {
  const session = socket.session;

  try {
    if (!session) {
      throw new Error("No Session");
    }

    const { idSource, attributes } = data;

    if (!isSourceId(idSource)) {
      throw new Error("missing source id");
    }
    const aliases = await getAttributesAlias(idSource, attributes, pgRead);

    cb(aliases);
  } catch (e) {
    console.error(e);
    await socket.notifyInfoError({
      message: e.message,
    });
  }
  cb(null);
  return;
}

/**
 * WS handler for source metadata
 */
export async function ioSourceMetadata(socket, data, cb) {
  const session = socket.session;

  try {
    if (!session) {
      throw new Error("No Session");
    }

    const { idSource } = data;

    if (!isSourceId(idSource)) {
      throw new Error("missing source id");
    }

    // array of metadata
    const metadata = await getSourceMetadata({
      id: idSource,
      format: "mapx-json",
    });

    cb(metadata);
  } catch (e) {
    console.error(e);
    await socket.notifyInfoError({
      message: e.message,
    });
  }
  cb(null);
  return;
}

/**
 * Helper to fetch metadata
 * @param {String} id Id of the source
 * @return {Object} metadata row
 */
async function getMetadataRow(id, pgClient = pgRead) {
  const sql = parseTemplate(templates.getSourceMetadata, {
    idSource: id,
  });

  const res = await pgClient.query(sql, [id]);

  const out = {
    metadata: {},
    join_config: [],
    date_modified: null,
    email_editor: null,
    services: [],
  };

  if (res.rowCount === 0) {
    return out;
  }

  Object.assign(out, res.rows[0]);

  return out;
}

/**
 * Helper to get source metadata from db
 * @param {Object} opt options
 * @param {String} opt.id Id of the source
 * @param {String} opt.format format (disabled now. Will be mapx-json or iso-xml)
 * @return {Promise<Array>} Lsit of metadata
 */
export async function getSourceMetadata(opt) {
  const { id } = opt;

  if (!isSourceId(id)) {
    throw Error("Not valid source id");
  }

  const all = [];
  const meta = await getMetadataPrefixed(id, null);
  const { _type: type, _join: joinConfig } = meta;

  all.push(meta);

  if (type === "join") {
    const { id_source, _prefix: prefix } = joinConfig?.base || {};
    const metaBase = await getMetadataPrefixed(id_source, prefix);

    all.push(metaBase);

    for (const join of joinConfig.joins) {
      const { id_source: id_source_join, _prefix: prefix_join } = join;
      const metaJoin = await getMetadataPrefixed(id_source_join, prefix_join);
      all.push(metaJoin);
    }
  }

  return all;
}

/**
 * Retrieve metadata object and add internal properties
 * @returns {Promise<Object>}  metadata with internal properties
 */
async function getMetadataPrefixed(idSource, prefix) {
  const row = await getMetadataRow(idSource);
  const { type, metadata, join_config, email_editor, date_modified, services } =
    row;

  metadata._id_source = idSource;
  metadata._type = type;
  metadata._join = join_config;
  metadata._email_editor = email_editor;
  metadata._date_modified = date_modified;
  metadata._services = services;
  metadata._prefix = prefix;
  return metadata;
}

/**
 * Retrieves a dictionary of attribute aliases for a given source.
 *
 * @param {string} id_source - The ID of the source.
 * @param {string[]} attributes - Array of attribute names to retrieve aliases for.
 * @param {Object} pgClient - PostgreSQL client for database queries.
 * @returns {Promise<Object>} - A promise that resolves to a dictionary of attribute aliases.
 */
export async function getAttributesAlias(id_source, attributes) {
  // Retrieve the source data
  const row = await getMetadataRow(id_source);

  const { join_config, type, metadata } = row;

  // Initialize the dictionary to store the aliases
  const aliases = {};

  if (type !== "join") {
    // Handle tabular or vector type source
    const attributesAlias = metadata?.text?.attributes_alias || {};
    for (const attr of attributes) {
      aliases[attr] = attributesAlias[attr] || { en: attr };
    }
  } else {
    // Handle join type source
    const items = join_config.joins;
    items.push(join_config.base);
    for (const item of items) {
      const { metadata } = await getMetadataRow(item.id_source);

      const alias = metadata?.text?.attributes_alias || {};
      const usePrefix = isNotEmpty(item._prefix);

      for (const attribute of attributes) {
        let originalAttribute = attribute;

        if (usePrefix) {
          const matchPrefix = attribute.startsWith(item._prefix);

          if (!matchPrefix) {
            continue;
          }
          originalAttribute = attribute.substring(item._prefix.length);
        }
        if (!alias[originalAttribute]) {
          continue;
        }
        aliases[attribute] = alias[originalAttribute];
      }
    }
  }

  return aliases;
}

/**
 * Get source data from mx_sources
 */
export async function getSourceData(idSource, client = pgRead) {
  const res = await client.query(templates.getSourceJoinData, [idSource]);
  if (res.rowCount === 0) {
    return {};
  }
  return res.rows[0]?.data || {};
}
