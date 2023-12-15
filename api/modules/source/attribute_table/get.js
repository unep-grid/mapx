import { pgRead } from "#mapx/db";
import {
  getColumnsTypesSimple,
  getColumnsNames,
  tableExists,
  getMxSourceData,
} from "#mapx/db_utils";
import { getDistinct, toPgColumn, sendJSON, sendError } from "#mapx/helpers";
import { isEmpty, isString, isSourceId } from "@fxi/mx_valid";
export const mwGetAttributeTable = [getSourceAttributeTableHandler];

async function getSourceAttributeTableHandler(req, res) {
  try {
    const data = await getSourceAttributeTable({
      id: req.query.id,
      attributes: req.query.attributes,
    });
    const columnsOrderSaved = await getMxSourceData(req.query.id, [
      "settings",
      "editor",
      "columns_order",
    ]);
    const columnsOrder = !columnsOrderSaved
      ? false
      : columnsOrderSaved.filter((c) => req.query.attributes.includes(c));

    const table = {
      columnsOrder,
      data: data.rows,
    };

    sendJSON(res, table, { end: true });
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
    attributes.length = 0;
    attributes.push(...allAttributes);
  }

  const attributesSelect = attributes.filter((a) => {
    const toIgnore = attributesToIgnore.includes(a);
    // prevent unknow column / injection
    const exists = allAttributes.includes(a);
    return !toIgnore && exists;
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
