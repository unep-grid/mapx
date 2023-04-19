import { ioAddViewVt } from "./new.js";
import { ioViewPin } from "./pin.js";
import {
  mwGet,
  mwGetMetadata,
  getView,
  getViewMetadata,
  getViewsIdBySource,
  getViewsTableBySource,
} from "./getView.js";
import { mwGetListPublic, getViewsPublic } from "./getViewsPublic.js";
import { getViewsGeoserver } from "./getViewsGeoserver.js";
import {
  setViewStyleAlt,
  ioUpdateDbViewAltStyle,
  ioUpdateDbViewsAltStyleBySource,
} from "./setViewStyleAlt.js";
import {
  ioUpdateClientViews,
  ioUpdateClientViewsBySource,
} from "./replaceClientViews.js";

import {
  mwGetListByProject,
  getViews,
  getProjectViewsStates,
} from "./getViewsByProject.js";

export {
  ioUpdateClientViews,
  ioUpdateClientViewsBySource,
  ioAddViewVt,
  ioViewPin,
  ioUpdateDbViewAltStyle,
  ioUpdateDbViewsAltStyleBySource,
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
  getView,
  getViews,
  getViewsPublic,
  getViewsIdBySource,
  getViewMetadata,
  getProjectViewsStates,
  getViewsGeoserver,
  getViewsTableBySource,
  setViewStyleAlt,
};
