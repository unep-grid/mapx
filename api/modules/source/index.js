import { mwGet } from "./getSource.js";
import { mwGetMetadata, getSourceMetadata } from "./getSourceMetadata.js";
import { mwGetSummary, getSourceSummary } from "./getSourceSummary.js";
import { mwGetOverlap } from "./getSourceOverlap.js";
import { mwGetAttributeTable } from "./getSourceTableAttribute.js";
import { mwGetGeomValidate } from "./getSourceValidityGeom.js";
import { getSourcesServicesProject } from "./getSourceServices.js";

export { getSourceMetadata, getSourceSummary, getSourcesServicesProject };

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
  getSourceSummary,
};
