import { path } from "./../mx_helper_misc.js";
import { modal } from "./../mx_helper_modal.js";
import { getView, getViews } from "./../map_helpers";
import { isView, isArray } from "./../is_test";
import { settings } from "./../settings";
import { getDictItem, updateLanguageElements } from "./../language";
import { el } from "../el/src/index.js";
import {
  validationMetadataTestsToHTML,
  validateMetadataView,
} from "../metadata/validation.js";

/*
 * Update metadata and views badges
 * @param {Object} opt Config
 * @param {Array} opt.views List of views or views id to update. By default, all
 */
export async function updateViewsBadges(opt) {
  opt = Object.assign({}, { views: getViews() }, opt);
  try {
    if (!isArray(opt.views)) {
      throw new Error("Views must by array of views or view id");
    }
    const start = Date.now();
    const prom = [];
    for (let v of opt.views) {
      const view = getView(v);
      if (isView(view)) {
        prom.push(setViewBadges(view));
      }
    }
    await Promise.all(prom);
    const diff = Date.now() - start;
    console.log(`Views badges + meta validation: ${diff} [ms] `);
  } catch (e) {
    console.error("updateViewsBadges error:", e);
  }
}

/*
 * Update a sinfle view badges
 * @param {Object} view View
 */
export async function setViewBadges(view) {
  try {
    const viewBase = view._vb;
    const readers = view.readers || [];
    const hasEdit = view._edit === true || view.type === "gj";
    const isShared = view.project !== settings.project.id;
    const isValidable = ["rt", "vt", "cc"].includes(view.type);
    const hasViewMetadata = ["rt", "vt", "cc", "sm"].includes(view.type);
    const hasStats = ["rt", "vt", "cc", "sm"].includes(view.type);
    const hasPublic = readers.includes("public");
    const elBadges = viewBase.elBadges;
    const isTemp = view._temp === true;
    const hasLock = !(isTemp || isShared);

    if (!elBadges) {
      return;
    }
    elBadges.innerHTML = "";
    const badges = [];

    if (isTemp) {
      /**
       * Add public Badge
       */
      const elBadgeLinkTemp = elBadge("temp-link");
      badges.push(elBadgeLinkTemp);
    }

    if (hasPublic) {
      /**
       * Add public Badge
       */
      const elBadgePublic = elBadge("public");
      badges.push(elBadgePublic);
    }

    /**
     * Check if it's valid, add the validate badge
     */
    if (isValidable) {
      /**
       * Validate asynchronously metadata
       */
      if (hasPublic) {
        const validation = await validateMetadataView(view);

        if (!validation.valid) {
          /**
           * Add not valid badge
           */
          const elBadgeMeta = elBadge("meta-issues", {
            validation: validation,
          });
          badges.push(elBadgeMeta);
        }
      }
    }

    /**
     * Add shared badge
     */
    if (isShared) {
      const elBadgeShared = elBadge("shared");
      badges.push(elBadgeShared);
    }

    /**
     * Add editable badge:
     * lock open or closed
     */
    if (hasLock) {
      const elBadgeEdit = elBadge("edit", { editable: hasEdit });
      badges.push(elBadgeEdit);
    }

    /**
     * View metadata button / badge
     */
    if (hasViewMetadata) {
      const elBadgeMeta = elBadge("meta", { id: view.id });
      badges.push(elBadgeMeta);
    }
    /**
     * View stats button / badge
     */
    if (hasStats) {
      const elBadgeStats = elBadge("stats", { id: view.id });
      badges.push(elBadgeStats);
    }
    /**
     * Single loop add badge
     */
    for (let b of badges) {
      elBadges.appendChild(b);
    }

    /**
     * Update languages
     */
    await updateLanguageElements({
      el: elBadges,
    });
  } catch (e) {
    console.error("setViewBadges error:", e);
  }
}

/**
 * Create el badge
 */
function elBadge(type, opt) {
  opt = Object.assign({}, opt);
  switch (type) {
    case "public": {
      return createViewBadge({
        iconClasses: ["fa", "fa-check-circle"],
        tooltipClasses: ["hint--bottom-right"],
        tooltipKey: "view_badge_public_valid",
        style: {
          color: "green",
        },
      });
    }
    case "meta-issues": {
      const results = path(opt, "validation.results");
      return createViewBadge({
        iconClasses: ["fa", "fa-exclamation-triangle"],
        style: {
          color: "DarkOrange",
        },
        tooltipClasses: ["hint--bottom-right"],
        tooltipKey: "view_badge_public_not_valid",
        dataset: {
          view_action_key: "btn_badge_warning_invalid_meta",
          view_action_data: JSON.stringify(results),
        },
      });
    }
    case "temp-link": {
      return createViewBadge({
        iconClasses: ["fa", "fa-chain"],
        style: {
          color: "HotPink",
        },
        tooltipClasses: ["hint--bottom-right"],
        tooltipKey: "view_badge_temp_shared",
        dataset: {
          view_action_key: "btn_badge_temp_shared",
        },
      });
    }
    case "shared": {
      return createViewBadge({
        iconClasses: ["fa", "fa-share-alt-square"],
        tooltipClasses: ["hint--bottom-right"],
        tooltipKey: "view_badge_shared",
        style: {
          color: "BlueViolet",
        },
      });
    }
    case "edit": {
      const hasEdit = opt.editable;
      return createViewBadge({
        iconClasses: ["fa", hasEdit ? "fa-unlock" : "fa-lock"],
        tooltipClasses: ["hint--bottom-right"],
        tooltipKey: hasEdit ? "view_badge_editable" : "view_badge_locked",
        style: {
          color: hasEdit ? "LimeGreen" : "OrangeRed",
        },
      });
    }
    case "meta": {
      return createViewBadge({
        iconClasses: ["fa", "fa-info-circle"],
        tooltipClasses: ["hint--bottom-right"],
        tooltipKey: "btn_opt_meta",
        style: {
          color: "royalblue",
        },
        dataset: {
          view_action_key: "btn_opt_meta",
          view_action_target: opt.id,
        },
      });
    }
    case "stats": {
      return createViewBadge({
        iconClasses: ["fa", "fa-bar-chart"],
        tooltipClasses: ["hint--bottom-right"],
        tooltipKey: "btn_opt_stats",
        style: {
          color: "indianred",
        },
        dataset: {
          view_action_key: "btn_opt_stats",
          view_action_target: opt.id,
        },
      });
    }
    default: {
      console.warn("unknown badge");
    }
  }
}
/**
 * create a view badge
 */
function createViewBadge(opt) {
  opt = Object.assign(
    {},
    {
      dataset: {},
      style: {},
    },
    opt,
  );
  opt.dataset = Object.assign(
    {},
    {
      view_action_key: "btn_badge_show_modal_badge",
      view_action_data: opt.tooltipKey,
      lang_type: "tooltip",
      lang_key: opt.tooltipKey || "",
    },
    opt.dataset,
  );
  return el(
    "button",
    {
      class: ["mx-btn", ...(opt.tooltipClasses || ["hint--bottom-right"])],
      dataset: opt.dataset,
      role: "button",
    },
    el("i", {
      class: opt.iconClasses || ["fa", "fa-check-circle"],
      style: opt.style,
    }),
  );
}

/*
 * Display a modal window with validation results
 * NOTE: see event handler in app/src/js/views_click
 * @param {Object} results validation results
 */
export async function displayMetadataIssuesModal(results) {
  modal({
    id: "modal_validation_metadata",
    replace: true,
    title: await getDictItem("validate_meta_modal_title"),
    content: validationMetadataTestsToHTML(results),
    addBackground: true,
  });
}
