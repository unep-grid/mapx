const pgRead = require.main.require('./db').pgRead;
const db = require('./db.js');
const utils = require('./utils.js');

exports.get = [getSourceAttributeTableHandler];

function getSourceAttributeTableHandler(req, res) {
  getSourceAttributeTable({
    id: req.query.id,
    attributes: req.query.attributes
  })
    .then((data) => {
      utils.sendJSON(res, data, true);
    })
    .catch((err) => {
      utils.sendError(res, err);
    });
}

function getSourceAttributeTable(opt) {
  var idSource = opt.id;
  var attributes = opt.attributes || [];
  if (typeof attributes === 'string') {
    attributes = attributes.split(',');
  }
  var attributesToIgnore = ['geom'];
  var attributesSelect = [];
  var query = '';

  if (!idSource || attributes.length === 0) {
    Promise.resolve([]);
  }

  return db
    .getColumnsNames(idSource)
    .then((attr) => {
      attributesSelect = attr.filter((a) => {
        return (
          attributesToIgnore.indexOf(a) === -1 && attributes.indexOf(a) > -1
        );
      });
      if (attributesSelect.length === 0) {
        return {
          rowCount: 0
        };
      } else {
        attributesSelect = utils.getDistinct(attributesSelect);
        attributesSelect = utils.toPgColumn(attributesSelect);
        query = `SELECT ${attributesSelect} FROM ${idSource} `;
        return pgRead.query(query);
      }
    })
    .then((res) => {
      if (res.rowCount > 0) {
        return res.rows;
      } else {
        return [];
      }
    })
    .catch((e) => {
      throw new Error(e);
    });
}
