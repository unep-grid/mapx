import { theme } from "../init_theme";
import { updateIfEmpty } from "../mx_helper_misc";
import { isArrayOfViews } from "../is_test";
import { isNotEmpty } from "../is_test";
import { RadialProgress } from "../radial_progress";
import {
  getGeoJSONViewsFromStorage,
  getViewsFilter,
  getViewsList,
  layersOrderAuto,
} from "../map_helpers";
import { fetchViews } from "../map_helpers/views_fetch";
import { viewsListAddSingle, viewsListRenderNew } from "../views_list_manager";
import { settings } from "../settings";
import { getQueryInit } from "../url_utils";
import { events } from "../mx";

/**
 * Class to manage and update the views list
 */
export class ViewsUpdateHelper {
  /**
   * Initialize the ViewsUpdateHelper
   */
  constructor() {
    this.views = [];
    this.elProgContainer = null;
    this.nCache = 0;
    this.nNetwork = 0;
    this.nTot = 0;
    this.prog = null;
    this.progressColor = theme.getColorThemeItem("mx_ui_link");
    this.opt = {};
  }

  /**
   * Save view list to views
   * @param {Object} opt options
   * @param {String} opt.id ID of the map
   * @param {String} opt.project ID of the project
   * @param {Array} opt.viewsList views list
   * @param {Boolean} opt.render Render given view
   * @param {Boolean} opt.resetView Reset given view
   * @param {Boolean} opt.useQueryFilters In fetch all mode, use query filters
   */
  async updateViewsList(opt) {
    this.opt = opt;

    /*
     * See default used:
     * - app/src/r/server/view_update_client.R
     * - app/src/r/helpers/binding_mgl.R
     */
    const def = {
      id: "map_main",
      project: settings.project.id,
      viewsList: [],
      render: false,
      resetViews: false,
      useQueryFilters: true,
    };
    updateIfEmpty(this.opt, def);

    const viewsToAdd = this.opt.viewsList;
    const hasViewsList = isArrayOfViews(viewsToAdd) && isNotEmpty(viewsToAdd);

    if (hasViewsList) {
      this.nTot = viewsToAdd.length;
    }

    /**
     * Set fetch mode
     */
    if (hasViewsList) {
      /* Views are given, add them */
      this.views.push(viewsToAdd);
      await this.addLocal(viewsToAdd);
    } else {
      /* Views should be fetched */
      this.views.push(...(await this.addAsyncAll()));
    }

    /**
     * Remove progress if it has been instantiated. See :
     *  - updateProgress
     */
    if (this.prog instanceof RadialProgress) {
      this.prog.destroy();
    }

    events.fire({
      type: "views_list_updated",
    });

    return this.views;
  }

  /**
   * Add all views from automatic fetch
   */
  async addAsyncAll() {
    const views = [];
    const state = [];

    /**
     * Local GeoJSON views
     */
    const viewsGeoJSON = await getGeoJSONViewsFromStorage({
      project: this.opt.project,
    });
    views.push(...viewsGeoJSON);

    /**
     * Remote views
     */
    const data = await fetchViews({
      onProgress: this.updateProgress.bind(this),
      idProject: this.opt.project,
      useQueryFilters: this.opt.useQueryFilters,
    });
    views.push(...data.views);
    state.push(
      ...data.states.reduce((a, s) => {
        if (s.id === "default") {
          return s.state;
        } else {
          return a;
        }
      }, state),
    );

    /**
     * Render
     */
    await viewsListRenderNew({
      id: this.opt.id,
      views: views,
      state: state,
    });

    /**
     * Add additional logic if query param should be used
     */
    if (this.opt.useQueryFilters) {
      const conf = getQueryInit();
      const viewsList = getViewsList();

      /**
       * Set flat mode (hide categories)
       */
      if (conf.isFlatMode) {
        viewsList.setModeFlat(true, { permanent: true });
      }
      const idViewsOpen = conf.idViewsOpen;
      const isFilterActivated = conf.isFilterActivated;

      /**
       * Move view to open to the top
       */
      if (isNotEmpty(idViewsOpen)) {
        const idViewsOpenInv = idViewsOpen.reverse();
        viewsList.setModeAnimate(false);
        for (const id of idViewsOpenInv) {
          viewsList.moveTargetTop(id);
        }
        viewsList.setModeAnimate(true);
      }

      /**
       * Add views
       */
      for (const id of idViewsOpen) {
        await viewAdd(id);
      }

      /**
       * If any view requested to be open, filter activated
       */
      if (isFilterActivated && idViewsOpen.length > 0) {
        const viewsFilter = getViewsFilter();
        viewsFilter.filterActivated(true);
      }

      /**
       * Update layers order
       */
      layersOrderAuto("update_views_list");
    }

    return views;
  }

  /**
   * Add a single view object, typically after an update
   * @param {Object} view The view to add
   */
  async addLocal(view) {
    if (isArrayOfViews(view)) {
      view = view[0];
    }
    await viewsListAddSingle(view, {
      open: true,
      render: true,
    });
    events.fire({
      type: "view_created",
    });
    return view;
  }

  /**
   * Update progress
   * @param {Object} d Progress data
   */
  updateProgress(d) {
    d = d || {
      loaded: this.nCache + this.nNetwork,
      total: this.nTot,
    };

    /**
     * Init
     */
    if (!this.elProgContainer) {
      this.elProgContainer = document.querySelector(".mx-views-list");
    }

    if (!this.prog && this.elProgContainer) {
      this.elProgContainer.replaceChildren();
      this.prog = new RadialProgress(this.elProgContainer, {
        radius: 30,
        stroke: 4,
        strokeColor: this.progressColor,
      });
    }

    /**
     * Update
     */
    if (
      this.prog instanceof RadialProgress &&
      this.prog.update &&
      this.elProgContainer
    ) {
      this.prog.update((d.loaded / d.total) * 100);
    }
  }
}
