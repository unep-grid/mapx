import {pgRead} from '#mapx/db';
import {sendError, sendJSON, parseTemplate} from '#mapx/helpers';
import {templates} from '#mapx/template';
import {isSourceId} from '@fxi/mx_valid';

export const mwGetMetadata = [getSourceMetadataHandler];

async function getSourceMetadataHandler(req, res) {
  try {
    const data = await getSourceMetadata({
      id: req.params.id,
      format: 'mapx-json'
    });
    sendJSON(res, data, {end: true});
  } catch (e) {
    sendError(res, e);
  }
}

/**
 * Helper to get source metadata from db
 * @param {Object} opt options
 * @param {String} opt.id Id of the source
 * @param {String} opt.format format (disabled now. Will be mapx-json or iso-xml)
 * @return {Object} metadata object
 */
export async function getSourceMetadata(opt) {
  var meta;
  var out;
  var def = {};
  var id = opt.id;

  if (!isSourceId(id)) {
    throw Error('Not valid source id');
  }

  const sql = parseTemplate(templates.getSourceMetadata, {
    idSource: id
  });
  const res = await pgRead.query(sql);

  if (res.rowCount === 0) {
    return def;
  }

  [out] = res.rows;
  meta = out.metadata;
  meta._email_editor = out.email_editor;
  meta._date_modified = out.date_modified;
  meta._services = out.services;
  meta._id_source = id;
  return meta;
}
