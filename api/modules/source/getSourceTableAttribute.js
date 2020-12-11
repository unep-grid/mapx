const {pgRead} = require('@mapx/db');
const db = require('@mapx/db-utils');
const helpers = require('@mapx/helpers');

module.exports.mwGetAttributeTable = [getSourceAttributeTableHandler];

async function getSourceAttributeTableHandler(req, res) {
  try {
    const data = await getSourceAttributeTable({
      id: req.query.id,
      attributes: req.query.attributes
    });
    helpers.sendJSON(res, data, {end: true});
  } catch (e) {
    helpers.sendError(res, e);
  }
}

async function getSourceAttributeTable(opt) {
  var idSource = opt.id;
  var attributes = opt.attributes || [];
  if (typeof attributes === 'string') {
    attributes = attributes.split(',');
  }
  var attributesToIgnore = ['geom'];
  var query = '';

  if (!idSource || attributes.length === 0) {
    return [];
  }

  const attr = await db.getColumnsNames(idSource);
  let attributesSelect = attr.filter((a) => {
    return attributesToIgnore.indexOf(a) === -1 && attributes.indexOf(a) > -1;
  });


  if (attributesSelect.length === 0) {
    return [];
  }

  attributesSelect = helpers.getDistinct(attributesSelect);
  attributesSelect = helpers.toPgColumn(attributesSelect);
  query = `SELECT ${attributesSelect} FROM ${idSource} `;
  const res = await pgRead.query(query);

  if (res.rowCount > 0) {
    return res.rows;
  } else {
    return [];
  }
}
