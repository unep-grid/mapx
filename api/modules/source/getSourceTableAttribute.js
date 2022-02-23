import {pgRead} from '#mapx/db';
import {getColumnsNames} from '#mapx/db-utils';
import {getDistinct, toPgColumn, sendJSON, sendError} from '#mapx/helpers';

const isString = (a) => typeof a === 'string';

export const mwGetAttributeTable = [getSourceAttributeTableHandler];

async function getSourceAttributeTableHandler(req, res) {
  try {
    const data = await getSourceAttributeTable({
      id: req.query.id,
      attributes: req.query.attributes
    });
    sendJSON(res, data, {end: true});
  } catch (e) {
    sendError(res, e);
  }
}

async function getSourceAttributeTable(opt) {
  const attributesToIgnore = ['geom'];
  const idSource = opt.id;
  let attributes = opt.attributes || [];
  let query = '';

  if (isString(attributes)) {
    attributes = attributes.split(',');
  }

  if (!idSource || attributes.length === 0) {
    return [];
  }

  const attr = await getColumnsNames(idSource);
  let attributesSelect = attr.filter((a) => {
    return !attributesToIgnore.includes(a) && attributes.indexOf(a) > -1;
  });

  if (attributesSelect.length === 0) {
    return [];
  }

  attributesSelect = getDistinct(attributesSelect);
  attributesSelect = toPgColumn(attributesSelect);
  query = `SELECT ${attributesSelect} FROM ${idSource} `;
  const res = await pgRead.query(query);

  if (res.rowCount > 0) {
    return res.rows;
  } else {
    return [];
  }
}
