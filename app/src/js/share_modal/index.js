import { modal } from "../mx_helper_modal.js";
import { EventSimple } from "../event_simple/index.js";
import {
  getDictItem,
  getLanguageCurrent,
  updateLanguage,
} from "./../language/index.js";
import { waitFrameAsync } from "./../animation_frame/index.js";
import {
  isStoryPlaying,
  getStoryId,
  getViewsStep,
} from "../story_map/index.js";
import { getArrayDistinct } from "../array_stat/index.js";
import { viewsListAddSingle } from "../views_list_manager";
import {
  isNotEmpty,
  isArrayOfViewsId,
  isBoolean,
  isEqual,
  isTrue,
} from "../is_test/index.js";
import { parseTemplate } from "../mx_helper_misc.js";
import { FlashItem } from "../icon_flash/index.js";
import { getQueryParametersAsObject } from "../url_utils";
import { modalMarkdown } from "../modal_markdown";
import { Throttle } from "./throttle.js";

import {
  getView,
  getViews,
  getViewsForJSON,
  getViewsLayersVisibles,
  getViewsListOpen,
  getViewsActive,
  getMapPos,
  setMapPos,
  viewRemove,
  viewsCloseAll,
} from "../map_helpers/index.js";
import {
  el,
  elButtonFa,
  elSpanTranslate,
  elCheckbox,
  elSelect,
  elDetails,
  elAlert,
} from "../el_mapx";
import "./style.less";
import socialLinks from "./social_link.json";
import shareMode from "./share_mode.json";
import { settings } from "./../settings";
import { bindAll } from "../bind_class_methods/index.js";
const t = elSpanTranslate;

const def = {
  views: [],
  throttle: 50,
};

export class ShareModal extends EventSimple {
  constructor(opt) {
    super();
    const sm = this;
    bindAll(sm);
    opt = Object.assign({}, def, opt);
    sm._throttle_update = new Throttle(50);
    sm.init(opt).catch((err) => {
      console.error(err);
    });
  }

  /**
   * Initialize modal
   */
  async init(opt) {
    const sm = this;
    if (window._share_modal) {
      window._share_modal.reset();
      return;
    }
    window._share_modal = sm;
    sm._init_state(opt);
    sm._validate_opt();
    sm._init_modal();

    sm.on("share_code_updated", sm._update_state_form);
    sm.on("state_form_updated", sm._update_state_views);
    sm.on("state_views_updated", sm._update_options_visibility);
    sm.on("options_visibility_changed", sm._update_state_form);
    await sm.reset();
    sm.fire("init");
  }

  _init_state(opt) {
    const sm = this;
    sm._state = {
      opt: {
        views: [],
      },
      url: null,
      modeCurrent: "static",
      shareString: "",
      mapPosItems: [
        "p",
        "b",
        "z",
        "lat",
        "lng",
        "t3d",
        "sat",
        "theme",
        "globe",
      ],
      mapPosItemsBounds: ["p", "b", "n", "s", "e", "w", "t3d", "sat", "theme"],
      prevent: new Set(),
      views: [],
      /** note : unchecked checkbox are not included in formData.-
       * -> using keys of this object in loop is required to
       *    get all values during update..
       **/
      form: {
        share_code: null,
        share_template: null,
        share_views_select: null,
        share_views_zoom: null,
        share_map_pos: null,
        share_map_pos_max: null,
        share_mode_static: null,
        share_category_hide: null,
      },
    };
    Object.assign(sm._state.opt, opt);
  }

  async setForm(stateForm) {
    const sm = this;
    const elForm = sm._el_form;
    const form = Object.assign({}, stateForm);
    for (const key in form) {
      const elInput = elForm.querySelector(`[name=${key}]`);
      if (!elInput) {
        continue;
      }
      const value = form[key];
      const isCheckbox = elInput.type === "checkbox";
      if (isCheckbox) {
        elInput.checked = !!value;
      } else {
        elInput.value = value;
      }
    }
    await sm.update();
  }

  async reset() {
    const sm = this;
    sm.build();
    await sm.update();
    sm.fire("reset");
  }

  /**
   * Remove + clean
   */
  close() {
    const sm = this;
    if (sm._closed) {
      return;
    }
    sm._closed = true;
    sm._modal.close();
    sm.fire("closed");
    sm.destroy(); //events
    delete window._share_modal;
  }

  /**
   * Update
   * @return {Promise<boolean>} done
   */
  update() {
    const sm = this;
    return sm._throttle_update.exec(sm._update);
  }

  _update() {
    const sm = this;
    return new Promise((resolve) => {
      sm._state.prevent.clear();
      /* linked updates */
      sm._update_state_form();
      sm._update_state_views();
      sm._update_options_visibility();
      /* result update */
      sm._update_messages();
      sm._update_buttons();
      sm._update_url();
      sm._update_template();

      sm.fire("updated");
      resolve(true);
    });
  }

  /**
   * Validate options
   */

  _validate_opt() {
    const sm = this;
    const views = sm._get_views_opt();
    const msgs = [];
    if (views.length > 0) {
      if (!isArrayOfViewsId(views)) {
        msgs.push({
          type: "error",
          key: "share_msg_invalid_views",
        });
      }
    }
    if (msgs.length > 0) {
      throw new Error(`Invalid option ${JSON.stringify(msgs)}`);
    }
  }
  /**
   * Update state with form values
   */
  _update_state_form() {
    const sm = this;
    const elForm = sm._el_form;
    const form = Object.assign({}, sm._state.form);
    for (const key in sm._state.form) {
      const elInput = elForm.querySelector(`[name=${key}]`);
      const isEnabled = !elInput.disabled;
      const isCheckbox = elInput.type === "checkbox";
      const value = isEnabled
        ? isCheckbox
          ? elInput.checked
          : elInput.value
        : null;
      form[key] = value;
    }

    if (isEqual(form, sm._state.form)) {
      return sm._state.form;
    }

    Object.assign(sm._state.form, form);
    sm.fire("state_form_updated");
  }

  /**
   * Get views set in option at init time
   */
  _get_views_opt() {
    const sm = this;
    return sm._state?.opt?.views || [];
  }

  /**
   * Update views list
   */
  _update_state_views() {
    const sm = this;
    const state = sm._state;
    const sMode = state.form.share_views_select;
    const views = [];
    switch (sMode) {
      case "share_views_select_method_preselect":
        views.push(...sm._get_views_opt());
        break;
      case "share_views_select_method_story_step":
        views.push(...(getViewsStep() || []));
        break;
      case "share_views_select_method_story_itself":
        views.push(getStoryId());
        break;
      case "share_views_select_method_map_list_active":
        views.push(...(getViewsActive() || []));
        break;
      case "share_views_select_method_current_url":
        const p = getQueryParametersAsObject();
        const vFilter = p.views || p.idViews || [];
        vFilter.push(...(p.viewsOpen || p.idViewsOpen || []));
        views.push(...vFilter);
        break;
      case "share_views_select_method_map_list_open":
      default:
        views.push(...(getViewsListOpen() || []));
        break;
      /**
       * Disabled handler
       */
      case "share_views_select_method_all":
        break;
      case "share_views_select_method_map_layer":
        views.push(...(getViewsLayersVisibles(true) || []));
        break;
    }

    const viewsOut = getArrayDistinct(views);

    if (isEqual(viewsOut, state.views)) {
      return views;
    }
    state.views.length = 0;
    state.views.push(...viewsOut);
    sm.fire("state_views_updated");
    return state.views;
  }

  /**
   * Check if views list contains a story
   */
  hasTargetStory() {
    const sm = this;
    const f = sm._state.form;
    const idViews = sm._state.views;
    const modeTargetStory =
      f.share_views_select === "share_views_select_method_story_itself";
    const storyInViews = getViews(idViews).reduce(
      (a, c) => a || c.type === "sm",
      false
    );
    return modeTargetStory || storyInViews;
  }

  /**
   * Validate message
   */
  _update_messages() {
    const sm = this;
    const state = sm._state;
    const msgs = [];
    const idViews = state.views;
    const useStatic = !!state.form.share_mode_static;
    const useMapPos = !!state.form.share_map_pos;
    const count = idViews.length;
    const targetStory = sm.hasTargetStory();
    const langData = { data: { n: count } };

    if (count === 1) {
      msgs.push({
        type: "info",
        key: "share_msg_views_count_single",
        data: langData,
      });
    }
    if (count > 1) {
      msgs.push({
        type: "info",
        key: "share_msg_views_count_multiple",
        data: langData,
      });
      if (targetStory && useStatic) {
        msgs.push({
          type: "warning",
          key: "share_msg_multiple_views_story_static",
        });
      }
    }
    if (count === 0) {
      if (useStatic && !useMapPos) {
        state.prevent.add("copy");
        state.prevent.add("open");
        msgs.push({
          type: "danger",
          key: "share_msg_views_count_empty_static",
        });
      } else if (useStatic) {
        msgs.push({
          type: "warning",
          key: "share_msg_views_count_empty_static_map_pos",
        });
      } else {
        msgs.push({
          type: "warning",
          key: "share_msg_views_count_empty_full_project",
        });
      }
    }
    sm._validate_messages(msgs);

    return msgs;
  }

  /**
   * Display validation messages
   */

  _validate_messages(msgs) {
    const sm = this;
    const elMsgContainer = sm._el_msg_container;
    while (elMsgContainer.firstElementChild) {
      elMsgContainer.firstElementChild.remove();
    }
    for (const msg of msgs) {
      const elMsg = elAlert(msg.key, msg.type, msg.data);
      elMsgContainer.appendChild(elMsg);
    }
  }

  _update_buttons() {
    const sm = this;
    const state = sm._state;
    sm.allowBtnOpen(!state.prevent.has("open"));
    sm.allowBtnCopy(!state.prevent.has("copy"));
  }

  _update_options_visibility() {
    const sm = this;
    const state = sm._state;
    const f = state.form;
    const hasViews = state.views.length > 0;
    const modeStatic = f.share_mode_static;
    const noMapPosition = !f.share_map_pos;
    const targetStory = sm.hasTargetStory();
    const disableMaxPos = (modeStatic && noMapPosition) || targetStory;

    const out = [
      sm.setClassDisable(sm._el_checkbox_category_hide, modeStatic),
      sm.setClassDisable(sm._el_checkbox_map_pos, modeStatic && targetStory),
      sm.setClassDisable(sm._el_checkbox_map_pos_max, disableMaxPos),
      sm.setClassDisable(
        sm._el_checkbox_zoom,
        targetStory || !hasViews || !modeStatic
      ),
    ];
    if (out.some(isTrue)) {
      sm.fire("options_visibility_changed");
    }
  }

  /**
   * Update  URL to share
   */

  _update_url() {
    const sm = this;
    const state = sm._state;
    const url = new URL(window.origin);
    const hasViews = state.views.length > 0;
    const f = state.form;
    const targetStory = sm.hasTargetStory();
    const modeStatic = f.share_mode_static;
    const modeApp = !modeStatic;

    /**
     * Update base searchParams ( views, project )
     *  for (const p in state.params) {
     *    const val = state.params[p];
     *    if (val) {
     *      url.searchParams.set(p, val);
     *    }
     *  }
     */

    /**
     * Mode Static
     */
    url.pathname = f.share_mode_static ? "/static.html" : "/";

    /**
     * Options
     */
    const lang = getLanguageCurrent();
    url.searchParams.set("language", lang);

    /* mode static */
    if (modeStatic) {
      if (hasViews) {
        url.searchParams.set("views", state.views);
        if (!targetStory) {
          if (isBoolean(f.share_views_zoom)) {
            url.searchParams.set("zoomToViews", f.share_views_zoom);
          }
        }
      }
    }

    /* mode app */
    if (modeApp) {
      if (isNotEmpty(settings.project.id)) {
        url.searchParams.set("project", settings.project.id);
      }
      if (isBoolean(f.share_category_hide)) {
        url.searchParams.set("viewsListFlatMode", f.share_category_hide);
      }
      if (hasViews) {
        url.searchParams.set("viewsOpen", state.views);
        url.searchParams.set("viewsListFilterActivated", true);
      }
    }

    /**
     * Map position
     */
    let pos;
    const storyMode = targetStory && modeStatic;
    const hasPos = isBoolean(f.share_map_pos) && f.share_map_pos;
    const enablePos = !storyMode && hasPos;
    const enableMaxPos = !modeStatic || (!storyMode && hasPos);

    if (enableMaxPos) {
      if (f.share_map_pos_max) {
        url.searchParams.set("useMaxBounds", true);
      }
    }

    if (enablePos) {
      const items = f.share_map_pos_max
        ? state.mapPosItemsBounds
        : state.mapPosItems;

      for (const i of items) {
        if (!pos) {
          pos = getMapPos();
        }
        url.searchParams.set(i, pos[i]);
      }
    }
    /**
     * Update url
     */
    this.url = url;
  }

  _update_template() {
    const sm = this;
    const state = sm._state;
    /**
     * Handle template
     */
    const url = sm.url;
    const f = state.form;
    const idLinkItem = f.share_template;
    const useStatic = f.share_mode_static;
    const linkItem = sm.getLinkItem(idLinkItem);
    const disableLinkApp = linkItem.disable_link_app && !useStatic;
    const disableLink = linkItem.disable_link;
    const disableEncode = !!linkItem.disable_encode;
    const disableCopy = linkItem.disable_copy;
    /* TODO: convert those as input.*/
    const text = "Shared from MapX";
    const title = "MapX";
    /*
     * replace values in template, if avaialble.
     *  email of the sender can't be set
     */
    const txt = parseTemplate(
      linkItem.template,
      {
        url,
        text,
        title,
      },
      {
        encodeURIComponent: !disableEncode,
      }
    );

    /*
     * Set share string in state and form
     */
    state.shareString = txt;
    sm._el_input.value = txt;
    sm.fire("share_code_updated");
    if (disableLink || disableLinkApp) {
      state.prevent.add("open");
    }
    if (disableCopy) {
      state.prevent.add("copy");
    }
    return txt;
  }

  /**
   * get share string
   */
  getShareCode() {
    const sm = this;
    return sm._state.form.share_code;
  }

  /**
   * Helpers
   */

  /**
   * Disable/enable buttons / el
   */
  allowBtnOpen(enable) {
    const sm = this;
    sm._el_button_open.disabled = !enable;
  }

  allowBtnCopy(enable) {
    const sm = this;
    sm._el_button_copy.disabled = !enable;
  }

  setClassDisable(target, disable) {
    const elInput = target.querySelector("input");
    const change = disable !== elInput.disabled;
    elInput.disabled = !!disable;
    if (disable) {
      target.classList.add("share--disabled");
    } else {
      target.classList.remove("share--disabled");
    }
    return change;
  }

  /**
   * Get link item
   * @param {String} id Link id
   */
  getLinkItem(id) {
    const item = socialLinks.find((s) => s.id === id);
    if (!item) {
      return socialLinks[0];
    }
    return item;
  }

  /**
   * Follow social link
   */
  openLink() {
    const sm = this;
    window.open(sm._el_input.value, "_blank");
  }

  /**
   * Open sharing manager wiki
   */
  openHelp() {
    return modalMarkdown({
      title: getDictItem("btn_help"),
      wiki: "Sharing-Manager",
    });
  }

  /**
   * Copy current url
   */
  copy() {
    const sm = this;
    const elTemp = el("input", { type: "text" });
    elTemp.value = sm.getShareCode();
    elTemp.select();
    navigator.clipboard.writeText(elTemp.value);
    new FlashItem("clipboard");
    sm.fire("copied");
  }

  /**
   * Build form
   */
  _init_modal() {
    const sm = this;
    if (sm._modal) {
      sm._modal.close();
    }
    sm._el_content = el("div");

    /**
     * Modal buttons
     */
    sm._el_button_close = elButtonFa("btn_close", {
      icon: "times",
      action: sm.close,
    });
    sm._el_button_help = elButtonFa("btn_help", {
      icon: "question-circle",
      action: sm.openHelp,
    });
    sm._el_button_copy = elButtonFa("btn_copy", {
      icon: "clipboard",
      action: sm.copy,
    });
    sm._el_button_open = elButtonFa("btn_share", {
      icon: "external-link",
      action: sm.openLink,
    });

    const elModalButtons = [
      sm._el_button_close,
      sm._el_button_help,
      sm._el_button_copy,
      sm._el_button_open,
    ];

    /**
     * Create modal
     */
    sm._modal = modal({
      id: "share_modal",
      content: sm._el_content,
      title: t("share_manager_title"),
      buttons: elModalButtons,
      addSelectize: false,
      noShinyBinding: true,
      removeCloseButton: true,
      addBackground: false,
      onClose: sm.close,
    });
  }

  /**
   * Set current mode: story, static or app
   */
  _update_mode_current() {
    const sm = this;
    const sViews = sm._get_views_opt();
    sm._state.modeCurrent =
      sViews.length > 0
        ? "preselect"
        : isStoryPlaying()
        ? "story"
        : !!settings.mode.app
        ? "app"
        : "static";
  }

  build() {
    const sm = this;
    const state = sm._state;
    sm._update_mode_current();

    /**
     * Link / Code text
     */
    sm._el_input = el("textarea", {
      name: "share_code",
      id: "share_code",
      rows: 4,
      class: ["form-control", "share--code"],
    });

    sm._el_group_input = el("div", { class: "form-group" }, [
      el(
        "label",
        { class: "share--label-group", for: "share_code" },
        t("share_form_title")
      ),
      el(
        "small",
        { class: ["help-block", "text-muted"] },
        t("share_mode_warn")
      ),
      sm._el_input,
    ]);

    /**
     * Validation messages
     */
    sm._el_container_validation = sm._el_msg_container = el("div");

    /**
     * Template selection
     */
    sm._el_select_template = elSelect("share_template", {
      items: socialLinks.map((s) => el("option", { value: s.id }, s.label)),
    });

    /**
     * Views selection
     */
    const sModes = shareMode
      .filter((s) => s.mode.includes(state.modeCurrent))
      .map((s) => s.id);

    sm._el_select_mode = elSelect("share_views_select", {
      items: sModes.map((idMode) => el("option", { value: idMode }, t(idMode))),
    });

    /**
     * Checkboxes
     */
    /* mode app */
    sm._el_checkbox_category_hide = elCheckbox("share_category_hide", {
      checked: false,
    });
    /* all mode */
    sm._el_checkbox_static = elCheckbox("share_mode_static", { checked: true });
    sm._el_checkbox_zoom = elCheckbox("share_views_zoom", { checked: true });
    sm._el_checkbox_map_pos = elCheckbox("share_map_pos", { checked: true });
    sm._el_checkbox_map_pos_max = elCheckbox("share_map_pos_max", {
      checked: false,
    });

    /**
     * Settings
     */
    sm._el_group_options = elDetails(
      "share_options",
      el(
        "div",
        { class: "well", style: { maxHeight: "300px", overflowY: "auto" } },
        [
          sm._el_checkbox_static,
          sm._el_checkbox_map_pos,
          sm._el_checkbox_map_pos_max,
          sm._el_checkbox_zoom,
          sm._el_checkbox_category_hide,
        ]
      )
    );

    /**
     * Form
     */
    sm._el_form = el(
      "form",
      { name: "share_form", id: "test", on: ["change", sm.update] },
      [
        sm._el_group_input,
        sm._el_select_template,
        sm._el_select_mode,
        sm._el_group_options,
        sm._el_container_validation,
      ]
    );

    /**
     * Remove previous content, if required
     */
    while (sm._el_content.firstElementChild) {
      sm._el_content.firstElementChild.remove();
    }

    sm._el_content.appendChild(sm._el_form);

    sm._update_state_form();
    sm.fire("built");
  }

  async tests() {
    const sm = this;
    const { default: tests } = await import("./tests.json");
    const results = [];
    const langCurrent = getLanguageCurrent();
    for (const test of tests) {
      /**
       * Clear open views
       */
      await viewsCloseAll();
      const idViewsAdded = new Set();

      /**
       * Set language
       */
      const param = new URLSearchParams(test.search);
      const lang = param.get("language");

      if (lang) {
        await updateLanguage(lang);
      }

      /**
       * Add views if not in project, keep order
       */
      let n = test.views.length;
      while (n--) {
        const view = test.views[n];
        const hasView = !!getView(view);
        if (!hasView) {
          idViewsAdded.add(view.id);
        }
        const res = await viewsListAddSingle(view, { moveTop: true });
        if (!res) {
          console.error("View not added:", view?.id);
          continue;
        }
      }
      /**
       * Set map setting (lat,lng,..theme,...3d,..sat);
       */
      await setMapPos({ param: test.pos });
      await waitFrameAsync();
      await sm.setForm(test.form);

      /**
       * Compare result
       */
      const search = sm.url.search;
      test.passed = isEqual(search, test.search);

      if (!test.passed) {
        console.log({ search: search, test: test.search });
      }
      /**
       * Close and remove views
       */
      await viewsCloseAll();
      if (idViewsAdded.length) {
        for (const view of idViewsAdded) {
          await viewRemove(view);
        }
        console.log("remove view");
      }
      await updateLanguage(langCurrent);
      /**
       * Store results
       */
      results.push(test);
    }

    console.log(
      `${tests.length} tests passed : ${results.reduce(
        (a, r) => a && r.passed,
        true
      )}`
    );
    return results.reduce((a, r) => a && r.passed, true);
  }

  createTest() {
    const sm = this;
    const views = getViewsForJSON(sm._state.views);
    return {
      pos: Object.assign({ jump: true }, getMapPos()),
      views: views,
      form: sm._state.form,
      search: sm.url.search,
    };
  }
}
