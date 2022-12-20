import { pgRead } from "#mapx/db";
import {
  getColumnsTypesSimple,
  getColumnsNames,
  tableExists,
} from "#mapx/db-utils";
import { getDistinct, toPgColumn, sendJSON, sendError } from "#mapx/helpers";
import { isEmpty, isString, isSourceId } from "@fxi/mx_valid";
export const mwGetAttributeTable = [getSourceAttributeTableHandler];

async function getSourceAttributeTableHandler(req, res) {
  try {
    const data = await getSourceAttributeTable({
      id: req.query.id,
      attributes: req.query.attributes,
    });
    sendJSON(res, data.rows, { end: true });
  } catch (e) {
    sendError(res, e);
  }
}

/**
 * Get a source table, without geometry or other attributes to ignore
 * @param {Object} opt Options
 * @param {String} opt.id Id of the source / table / layer
 * @param {Boolean} opt.fullTable returns all atributes
 * @param {Boolean} opt.dateAsString coerce date as string
 * @param {Boolean} opt.jsonAsString coerce date as string
 * @param {Array} opt.attributes List of atributes to fetch
 * @return {Object} pg.Result or empty object
 */
export async function getSourceAttributeTable(opt) {
  //const attributesToIgnore = ["geom","_mx_valid"];
  const attributesToIgnore = ["geom"];
  const idSource = opt.id;
  const fullTable = opt.fullTable || false;
  const dateAsString = opt.dateAsString || false;
  const jsonAsString = opt.jsonAsString || false;
  let attributes = opt.attributes || [];

  if (isString(attributes)) {
    attributes = attributes.split(",");
  }

  const validId = isSourceId(idSource);

  if (!validId) {
    throw new Error(`Table ${idSource} : invalid id`);
  }
  const exists = await tableExists(idSource);

  if (!exists) {
    throw new Error(`Table ${idSource} does not exist`);
  }

  if (attributes.length === 0 && !fullTable) {
    return {};
  }

  const allAttributes = await getColumnsNames(idSource);

  if (fullTable) {
    attributes.push(...allAttributes);
  }

  const attributesSelect = attributes.filter((a) => {
    return !attributesToIgnore.includes(a) && allAttributes.includes(a);
  });

  if (isEmpty(attributesSelect)) {
    return {};
  }

  /**
   * node-postgres convert date and json as object. Not always wanted
   * see https://node-postgres.com/features/types#strings-by-default
   */
  const attributesAsText = [];
  if (dateAsString || jsonAsString) {
    const colMap = new Map();
    const columns = await getColumnsTypesSimple(idSource, attributesSelect);

    for (const c of columns) {
      colMap.set(c.column_name, c.column_type);
    }

    for (const a of attributesSelect) {
      const type = colMap.get(a);

      switch (type) {
        case "json":
        case "jsonb":
          if (jsonAsString) {
            attributesAsText.push(a);
          }
          break;
        case "time":
        case "date":
        case "time with time zone":
        case "time without time zone":
        case "timestamp with time zone":
        case "timestamp without time zone":
          if (dateAsString) {
            attributesAsText.push(a);
          }
          break;
      }
    }
  }

  const attributesSelectDistinct = getDistinct(attributesSelect);
  const attributesSelectSql = toPgColumn(attributesSelectDistinct, {
    castText: attributesAsText,
  });
  

  const query = `SELECT ${attributesSelectSql} FROM ${idSource} ORDER BY gid LIMIT 1e6`;
  return pgRead.query(query);
}
