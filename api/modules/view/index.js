const {mwGet, mwGetMetadata, getViewMetadata} = require(__dirname+'/getView.js');
const {mwGetListPublic, getViewsPublic} = require(__dirname+'/getViewsPublic.js');
const {mwGetListByProject, getViews, getProjectViewsStates} = require(__dirname+'/getViewsByProject.js');

module.exports = {
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
