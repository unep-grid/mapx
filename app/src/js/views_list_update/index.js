import { updateIfEmpty } from "../mx_helper_misc";
import { isArrayOfViews } from "../is_test";
import { isNotEmpty } from "../is_test";
import {
  getGeoJSONViewsFromStorage,
  getViewsFilter,
  getViewsList,
  layersOrderAuto,
  viewAdd,
} from "../map_helpers";
import { fetchViews } from "../map_helpers/views_fetch";
import { viewsListAddSingle, viewsListRenderNew } from "../views_list_manager";
import { settings } from "../settings";
import { getQueryInit } from "../url_utils";
import { events } from "../mx";

/**
 * Class to manage and update the views list
 */
export class ViewsListUpdate {
  /**
   * Initialize the ViewsListUpdate
   */
  /** @param {{loading?: {update: (data: Object) => void, finishing: () => void}, commit?: (work: () => Promise<unknown>) => Promise<unknown>}} [context] */
  constructor({ loading, commit = (work) => work() } = {}) {
    this.loading = loading;
    this.commit = commit;
    this.views = [];
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
   * @param {AbortSignal} [opt.signal]
   * @param {() => boolean} [opt.isCurrent] Guard against stale project updates
   * @param {Boolean} opt.useQueryFilters In fetch all mode, use query filters
   */
  async updateViewsList(opt) {
    this.opt = opt || {};

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

    if (this.opt.isCurrent && !this.opt.isCurrent()) {
      return [];
    }
    events.fire({
      type: "views_list_updated",
      data: { project: this.opt.project },
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
      signal: this.opt.signal,
      idProject: this.opt.project,
      useQueryFilters: this.opt.useQueryFilters,
      isCurrent: this.opt.isCurrent,
    });
    this.loading?.finishing();
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
    if (this.opt.isCurrent && !this.opt.isCurrent()) {
      return [];
    }
    await this.commit(async () => {
      if (this.opt.isCurrent && !this.opt.isCurrent()) {
        return;
      }
      await viewsListRenderNew({
        id: this.opt.id,
        views: views,
        state: state,
        project: this.opt.project,
        isCurrent: this.opt.isCurrent,
      });

      /**
       * Add additional logic if query param should be used
       */
      if (this.opt.isCurrent && !this.opt.isCurrent()) {
        return [];
      }
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
          if (this.opt.isCurrent && !this.opt.isCurrent()) {
            return [];
          }
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
    });
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
    return this.commit(async () => {
      if (this.opt.isCurrent && !this.opt.isCurrent()) {
        return [];
      }
      await viewsListAddSingle(view, {
        open: true,
        render: true,
      });
      if (this.opt.isCurrent && !this.opt.isCurrent()) {
        return [];
      }
      events.fire({
        type: "view_created",
      });
      return view;
    });
  }

  /** @param {{loaded: number, total: number, lengthComputable: boolean}} data */
  updateProgress(data) {
    if (this.opt.isCurrent && !this.opt.isCurrent()) {
      return;
    }
    this.loading?.update(data);
  }
}
