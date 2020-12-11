/**
 * Get view
 */
const {pgRead} = require('@mapx/db');
const helpers = require('@mapx/helpers');
const template = require('@mapx/template');
const valid = require('@fxi/mx_valid');

module.exports = {mwGet, mwGetMetadata, getViewMetadata};
/**
 * Get full view data
 */
async function mwGet(req, res) {
  try {
    const id = req.params.id;

    if (!valid.isViewId(id)) {
      throw new Error('No valid id');
    }

    const sql = helpers.parseTemplate(template.getViewFull, {
      idView: id
    });

    if (!sql) {
      throw new Error('Invalid query');
    }

    const result = await pgRead.query(sql);

    if (result && result.rowCount === 0) {
      return res.sendStatus(204);
    } else {
      const out = result.rows[0];
      return helpers.sendJSON(res, out || {});
    }
  } catch (e) {
    return helpers.sendError(res, e);
  }
}

async function mwGetMetadata(req, res) {
  try {
    const data = await getViewMetadata({id: req.params.id});
    helpers.sendJSON(res, data, {end: true});
  } catch (e) {
    helpers.sendError(res, e);
  }
}

/**
 * Helper to get view metadata items
 * @param {Object} opt options
 * @param {String} opt.id Id of the view
 * @return {Object} view metadata
 */
async function getViewMetadata(opt) {
  const id = opt.id.toUpperCase();
  if (!valid.isViewId(id)) {
    throw new Error('No valid id');
  }
  const sql = helpers.parseTemplate(template.getViewMetadata, {
    idView: id.toUpperCase()
  });
  const result = await pgRead.query(sql);
  if (result && result.rowCount > 0) {
    return result.rows[0];
  } else {
    return {};
  }
}
