import {mwGet} from './getSource.js';
import {mwGetMetadata, getSourceMetadata} from './getSourceMetadata.js';
import {mwGetSummary, getSourceSummary} from './getSourceSummary.js';
import {mwGetOverlap} from './getSourceOverlap.js';
import {mwGetAttributeTable} from './getSourceTableAttribute.js';
import {mwGetGeomValidate} from './getSourceValidityGeom.js';

export {getSourceMetadata, getSourceSummary};

export default {
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
