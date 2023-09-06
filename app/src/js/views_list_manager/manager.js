import { NestedList } from "./../nested_list/index.js";
import { ViewsFilter } from "./../views_filter/index.js";
import { ViewBase } from "./../views_builder/view_base.js";
import { settings } from "./../settings";
import { isTrue, isView, isArray } from "./../is_test_mapx";
import { itemFlashSave } from "./../mx_helper_misc.js";
import { getQueryParameterInit } from "./../url_utils";
import { updateLanguageElements } from "./../language";
import { updateViewsBadges } from "./../mx_helper_map_view_badges.js";
import { setViewBadges } from "./../mx_helper_map_view_badges.js";
import { bindAll } from "./../bind_class_methods/index.js";
import {
  viewModulesRemove,
  getView,
  getMapData,
  viewLayersAdd,
  viewsCloseAll,
  viewAdd,
  getViewTitleNormalized,
  getViewDateModified,
  viewsLayersOrderUpdate,
  hasViewsActivated,
  getViewJson,
} from "./../map_helpers";

let previousInstance = null;

/**
 * @class
 * @classdesc Manages the list of views.
 */
export class ViewsListManager {
  /**
   * Constructs a new ViewsListManager instance.
   * @param {Object} options - The configuration object for the manager.
   * @param {string} options.id - Identifier for the map.
   * @param {Array} options.views - Array of views.
   * @param {Array} [options.state] - State of the nested list.
   */
  constructor(options) {
    const vlm = this;
    vlm.idMap = options.id;
    vlm.mData = getMapData(vlm.idMap);
    vlm.elFilterText = document.getElementById("viewsFilterText");
    vlm.elFilterTags = document.getElementById("viewsFilterContainer");
    vlm.elFilterActivated = document.getElementById("btnFilterChecked");
    vlm.elFilterSwitch = document.getElementById("viewsFilterSwitch");
    vlm.elFilterCount = document.getElementById("viewsFilterCount");
    vlm.elViewsList = document.getElementById("mxViewsList");
    vlm._views = [...options.views];
    const hasState =
      options.state && isArray(options.state) && options.state.length > 0;
    vlm.state = hasState
      ? options.state
      : vlm.viewsToNestedListState(vlm._views);
    vlm.noViewsMode = isTrue(getQueryParameterInit("noViews")[0]);

    bindAll(vlm);
  }

  async init() {
    const vlm = this;
    if (previousInstance) {
      await previousInstance.clear();
    }
    previousInstance = vlm;
    await vlm.render();
  }

  /**
   * Retrieves the current views.
   * @returns {Array} Array of current views.
   */
  get views() {
    const vlm = this;
    return vlm.mData.views;
  }

  /**
   * Clear the manager, cleaning up resources.
   * @async
   * @returns {Promise<void>}
   */
  async clear() {
    const vlm = this;
    if (vlm.mData.viewsFilter instanceof ViewsFilter) {
      await vlm.mData.viewsFilter.destroy();
    }
    if (vlm.mData.viewsList instanceof NestedList) {
      await vlm.mData.viewsList.destroy();
    }
    if (vlm.mData.views.length > 0) {
      vlm.mData.views.length = 0;
    }
  }

  /**
   * Renders the manager's content.
   * @async
   * @returns {Promise<void>}
   */
  async render() {
    const vlm = this;
    await vlm.clear();
    vlm.mData.views.push(...vlm._views);

    vlm.mData.viewsList = new NestedList(vlm.elViewsList, {
      id: settings.project.id,
      state: vlm.state,
      locked: vlm.noViewsMode,
      useStateStored: true,
      autoMergeState: true,
      classDragHandle: "li-drag-handle",
      customDictItems: [
        { id: "name_group", en: "category", fr: "catégorie" },
        { id: "name_item", en: "view", fr: "vue" },
      ],
      eventsCallback: [
        /**
         * handlers non async
         */
        { id: "set_drag_image", action: vlm.handleSetDragImage },
        { id: "set_drag_text", action: vlm.handleSetDragText },
        { id: "state_save_local", action: itemFlashSave },
        { id: "state_sanitize", action: vlm.sanitizeState },
        { id: "get_item_text_by_id", action: getViewTitleNormalized },
        { id: "get_item_date_by_id", action: getViewDateModified },

        /**
         * Async handlers
         */
        { id: "render_item_content", action: vlm.handleRenderItemContent },
        { id: "order_change", action: viewsLayersOrderUpdate },
        { id: "destroy", action: viewsCloseAll },
        { id: "clear_all_items", action: viewsCloseAll },
      ],
    });

    vlm.mData.viewsFilter = new ViewsFilter(vlm.views, {
      elFilterActivated: vlm.elFilterActivated,
      elFilterTags: vlm.elFilterTags,
      elFilterSwitch: vlm.elFilterSwitch,
      elFilterText: vlm.elFilterText,
      operator: "and",
      onFilter: (ids, rules) => {
        /*
         * Update filter activated button
         */
        vlm.updateBtnFilterActivated();

        /*
         * Apply filter to nested list
         */
        vlm.mData.viewsList.filterById(ids, {
          flatMode: rules.length > 0,
        });
      },
      onUpdateCount: (count) => {
        /**
         * Update filter count
         */
        vlm.elFilterCount.innerText = `( ${count.nSubset} / ${count.nTot} )`;
      },
    });
  }

  /**
   * Retrieves the list instance.
   * @returns {Object} The list instance.
   */
  get li() {
    const vlm = this;
    return vlm.mData.viewsList;
  }

  /**
   * Handles drag image setting.
   * @param {HTMLElement} el - The element being dragged.
   * @returns {HTMLElement} The drag image element.
   */
  handleSetDragImage(el) {
    const vlm = this;
    const li = vlm.li;
    const isGroup = li.isGroup(el);
    const isItem = !isGroup && li.isItem(el);

    if (isGroup) {
      return el.querySelector(".li-group-header");
    }

    if (isItem) {
      return el.querySelector(".mx-view-tgl-content");
    }
    return el;
  }

  /**
   * Handles drag text setting.
   * @param {HTMLElement} el - The element being dragged.
   * @returns {string|Object} The drag text or dataset.
   */
  handleSetDragText(el) {
    const vlm = this;
    const li = vlm.li;
    const isGroup = li.isGroup(el);
    const isItem = !isGroup && li.isItem(el);
    if (isGroup) {
      return el.id;
    }
    if (isItem) {
      const view = getView(el.id);
      if (view && view._vb) {
        let out = getViewJson(view);
        return out;
      } else {
        return el.dataset;
      }
    }
    return el;
  }

  /**
   * Internal view rendering handler.
   *
   * @async
   * @function
   * @param {Object} item - The item to be rendered.
   * @param {string} item.id - The unique identifier of the item.
   * @param {string} item.type - The type of the item.
   * @param {string} item.group - The group to which the item belongs.
   * @param {boolean} item.render - Flag indicating whether the item should be rendered.
   * @param {boolean} item.initState - The initial state of the item.
   * @returns {Promise<any>} Returns a promise which resolves once the rendering is complete.
   */
  async handleRenderItemContent(config) {
    try {
      const vlm = this;
      const li = vlm.li;
      const elItem = config.el;
      const data = config.data;
      const update = data.update;
      const open = data.open === true;

      /**
       * Add given element
       */
      if (data.el) {
        elItem.appendChild(data.el);
        return;
      }

      /**
       * No given element, assume it's a view
       */
      const view = data.view || vlm.mData.views.find((v) => v.id === data.id);
      const invalid = !isView(view);

      /**
       * View requested but not vailable)
       */
      if (invalid) {
        li.log(`View ${data.id} unavailable`);
        li.removeItemById(data.id);
        return;
      }

      /**
       * Remove view element
       */
      if (update && view._el) {
        view._el.remove();
      }

      /**
       * Create / update view element.
       */
      const viewBase = new ViewBase(view, update);

      /**
       * Get view element
       */
      const elView = viewBase.getEl();

      if (elView) {
        elItem.appendChild(elView);

        if (update) {
          await viewLayersAdd({
            view: view,
          });
          await updateLanguageElements({
            el: view._el,
          });
        }
        if (!update && open) {
          await viewAdd(view);
        }
        await setViewBadges(view);
      }
    } catch (e) {
      console.error("handleRenderItemContent error", e);
    }
  }

  /**
   * Sanitizes and expands the state according to the views list.
   * @param {Array} states - The state list to be sanitized.
   * @returns {Array} The modified state.
   */
  sanitizeState(states) {
    const vlm = this;
    const hasStateStored = isArray(states.stored) && states.stored.length > 0;
    let state = hasStateStored ? states.stored : states.orig || [];
    /**
     * Trim state
     */
    const idsViews = vlm.views.map((v) => v.id);
    state = state.filter((s) => {
      return s.type !== "item" || idsViews.indexOf(s.id) > -1;
    });
    /**
     * Expend state
     */
    const idsState = state.map((s) => s.id);
    for (const i of idsViews) {
      const missing = !idsState.includes(i);
      if (missing) {
        const newItem = { id: i, type: "item", render: true, moveTop: true };
        state.push(newItem);
      }
    }

    return state;
  }

  /**
   * View list to default nested list state
   * @param {Array} view list
   * @param {Arras} Array of state item.
   */
  viewsToNestedListState(views) {
    return views.map((v) => {
      return {
        id: v.id,
        group: "root",
        type: "item",
      };
    });
  }

  /**
   * Add single view to the views list
   * @param {Object} view View object to add
   * @param {Object} options
   * @param {String} options.id
   * @param {Boolean} options.moveTop Move view item to top
   * @param {Boolean} options.render Trigger item rendering
   * @param {Boolean} options.open Open and add view to the map
   * @param {Object} options.view View object to render
   * @return {Promise<Object>} Object options realised
   */
  async viewsListAddSingle(view, options) {
    options = options || {};
    const vlm = this;
    const li = vlm.li;
    const staticMode = !!settings.mode.static;

    if (!isView(view)) {
      return;
    }

    const opt_default = {
      id: view.id,
      moveTop: true,
      render: true,
      open: true,
      view: view,
    };

    options = Object.assign({}, opt_default, options);

    const ids = vlm.mData.views.map((v) => v.id);
    const idPosOld = ids.indexOf(view.id);
    const idNew = idPosOld === -1;
    if (!idNew) {
      vlm.mData.views.splice(idPosOld, 1);
    }
    vlm.mData.views.unshift(view);

    if (staticMode) {
      await viewLayersAdd({
        idView: view.id,
        addTitle: true,
      });
    } else {
      await li.addItem(options);
      await updateViewsBadges({ views: [view] });
      vlm.mData.viewsFilter.update();
    }

    return options;
  }

  /**
   * Updates a single view already in the views list.
   * @async
   * @param {Object} view - The view object to update.
   * @returns {Promise<void>}
   */
  async viewsListUpdateSingle(view) {
    const vlm = this;
    const li = vlm.li;
    const oldView = getView(view.id);
    if (isView(oldView)) {
      await viewModulesRemove(oldView);
    } else {
      console.warn("No old view to update");
    }
    Object.assign(oldView, view);
    const settings = {
      id: view.id,
      view: oldView,
      update: true,
      open: true,
    };
    await li.updateItem(settings);
    vlm.mData.viewsFilter.updateViewsComponents();
    vlm.mData.viewsFilter.updateCount();
  }

  /**
   * Updated views filter
   * @returns {void}
   */
  updateViewsFilter() {
    const vlm = this;
    vlm.mData.viewsFilter.update();
  }

  /**
   * Updates the state of the filter activation button.
   * @returns {void}
   */
  updateBtnFilterActivated() {
    const vlm = this;
    const enable = hasViewsActivated();
    const isActivated = vlm.elFilterActivated.classList.contains("active");
    if (isActivated || enable) {
      vlm.elFilterActivated.classList.remove("disabled");
    } else {
      vlm.elFilterActivated.classList.add("disabled");
    }
  }
}
