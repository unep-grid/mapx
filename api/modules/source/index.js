const {mwGet} = require('./getSource.js');
const {mwGetMetadata, getSourceMetadata} = require('./getSourceMetadata.js');
const {mwGetSummary, getSourceSummary} = require('./getSourceSummary.js');
const {mwGetOverlap} = require('./getSourceOverlap.js');
const {mwGetAttributeTable} = require('./getSourceTableAttribute.js');
const {mwGetGeomValidate} = require('./getSourceValidityGeom.js');

module.exports={
  /**
   * Middleware
   */
  mwGet,
  mwGetMetadata,
  mwGetSummary,
  mwGetAttributeTable,
  mwGetGeomValidate,
  mwGetOverlap,
  /**
   * helpers
   */
  getSourceMetadata,
  getSourceSummary
};
