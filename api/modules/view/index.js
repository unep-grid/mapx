import {mwGet, mwGetMetadata, getViewMetadata} from './getView.js';
import {mwGetListPublic, getViewsPublic} from './getViewsPublic.js';
import {
  mwGetListByProject,
  getViews,
  getProjectViewsStates
} from './getViewsByProject.js';

export {getViews, getViewsPublic, getViewMetadata, getProjectViewsStates};

export default {
  /**
   * middleware
   */
  mwGet,
  mwGetMetadata,
  mwGetListPublic,
  mwGetListByProject,
  /**
   * helpers
   */
  getViews,
  getViewsPublic,
  getViewMetadata,
  getProjectViewsStates
};
