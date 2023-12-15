import { pgRead } from "#mapx/db";
import { sendError, sendJSON, parseTemplate } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { isSourceId } from "@fxi/mx_valid";
import { getParamsValidator } from "#mapx/route_validation";

/**
 * Get tile
 */
const validateParamsAlias = getParamsValidator({
  required: ["idSource", "attributes"],
  expected: ["timestamp"],
});

export const mwGetMetadata = [getSourceMetadataHandler];
export const mwGetAttributesAlias = [
  validateParamsAlias,
  getSourceAttributesAliasHander,
];

async function getSourceMetadataHandler(req, res) {
  try {
    const data = await getSourceMetadata({
      id: req.params.id,
      format: "mapx-json",
    });
    sendJSON(res, data, { end: true });
  } catch (e) {
    sendError(res, e);
  }
}

async function getSourceAttributesAliasHander(req, res) {
  try {
    const { attributes, idSource } = req.query;
    const data = await getAttributesAlias(idSource, attributes, pgRead);
    sendJSON(res, data, { end: true });
  } catch (e) {
    sendError(res, e);
  }
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

  if (res.rowCount === 0) {
    return {};
  }

  return res.rows[0];
}

/**
 * Helper to get source metadata from db
 * @param {Object} opt options
 * @param {String} opt.id Id of the source
 * @param {String} opt.format format (disabled now. Will be mapx-json or iso-xml)
 * @return {Object} metadata object
 */
export async function getSourceMetadata(opt) {
  const { id } = opt;

  if (!isSourceId(id)) {
    throw Error("Not valid source id");
  }

  const row = await getMetadataRow(id);

  const { type, metadata, join_config, email_editor, date_modified, services } =
    row;

  metadata._join = join_config;
  metadata._email_editor = email_editor;
  metadata._date_modified = date_modified;
  metadata._services = services;
  metadata._id_source = id;
  metadata._join_meta = [];

  if (type === "join") {
    const config = metadata._join;
    const { id_source, _prefix: prefix } = config?.base || {};
    const { metadata: metaBase } = await getMetadataRow(id_source);

    metadata._join_meta.push({
      id_source: id_source,
      prefix: prefix,
      meta: metaBase,
    });

    for (const join of config.joins) {
      const { id_source: id_source_join, _prefix: prefix_join } = join;
      const { metadata: metaJoin } = await getMetadataRow(id_source_join);
      metadata._join_meta.push({
        id_source: id_source_join,
        prefix: prefix_join,
        meta: metaJoin,
      });
    }
  }

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
    const attributesAlias = metadata?.text?.attributes_alias;
    for (const attr of attributes) {
      aliases[attr] = attributesAlias[attr] || { en: attr };
    }
  } else {
    // Handle join type source
    for (const join of join_config.joins) {
      const { metadata } = await getMetadataRow(join.id_source);

      const alias = metadata?.text?.attributes_alias || {};

      for (const attr of attributes) {
        const hasPrefix = attr.startsWith(join._prefix);
        if (!hasPrefix) {
          continue;
        }
        const originalAttr = attr.substring(join._prefix.length);
        aliases[attr] = alias[originalAttr] || {
          en: originalAttr,
        };
      }
    }
  }

  return aliases;
}
