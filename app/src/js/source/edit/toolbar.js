import { modalSimple } from "./../../mx_helper_modal.js";
import { el, elButtonFa, elCheckbox, tt } from "../../el_mapx";
import { buttonEnable } from "../../mx_helper_misc.js";
import { RadialProgress } from "../../radial_progress";
import { theme } from "../../mx.js";
import { Popup } from "../../popup";
import { isNumeric } from "./../../is_test/index.js";
import { onNextFrame } from "../../animation_frame";

/**
 * Toolbar and progress UI : buttons construction and enabled states.
 * Mixin of EditTableSessionClient : `this` is the editor instance.
 */
export const toolbarMixin = {
  /**
   * Build UI
   */
  async build() {
    const et = this;

    if (et._built) {
      return;
    }
    et._el_button_close = elButtonFa("btn_close", {
      icon: "times",
      action: et.destroy,
    });
    et._el_button_save = elButtonFa("btn_save", {
      icon: "floppy-o",
      action: et._l(et.save),
    });
    et._el_button_undo = elButtonFa("btn_edit_undo", {
      icon: "undo",
      action: et._l(et.undo),
    });
    et._el_button_redo = elButtonFa("btn_edit_redo", {
      icon: "repeat",
      action: et._l(et.redo),
    });
    et._el_button_wiki = elButtonFa("btn_help", {
      icon: "question-circle",
      action: et.dialogHelp,
    });
    et._el_button_add_column = elButtonFa("btn_edit_add_column", {
      icon: "plus-circle",
      action: et._l(et.dialogAddColumn),
    });
    et._el_button_add_column_identity = elButtonFa(
      "btn_edit_add_identity_column",
      {
        icon: "plus-circle",
        action: et._l(et.dialogAddColumnIdentity),
      },
    );
    et._el_button_remove_column = elButtonFa("btn_edit_remove_column", {
      icon: "minus-circle",
      action: et._l(et.dialogRemoveColumn),
    });
    et._el_button_rename_column = elButtonFa("btn_edit_rename_column", {
      icon: "pencil",
      action: et._l(et.dialogRenameColumn),
    });
    et._el_button_duplicate_column = elButtonFa("btn_edit_duplicate_column", {
      icon: "copy",
      action: et._l(et.dialogDuplicateColumn),
    });
    et._el_button_stat = elButtonFa("btn_stat_attribute", {
      icon: "bar-chart",
      action: et.dialogStat,
    });
    et._el_button_colums_order = elButtonFa("btn_edit_columns_order", {
      icon: "sort",
      action: et._l(et.dialogColumnOrder),
    });
    et._el_checkbox_autosave = elCheckbox("btn_edit_autosave", {
      action: et.updateAutoSave,
      checked: true,
    });

    /**
     *  Rows
     */
    et._el_button_add_row = elButtonFa("btn_edit_add_row", {
      icon: "plus",
      action: et._l(et.dialogAddRow),
    });

    et._el_button_remove_rows = elButtonFa("btn_edit_remove_rows", {
      icon: "trash",
      action: et._l(et.dialogRemoveRows),
    });

    /**
     * Geom
     */
    et._el_button_geom_validate = elButtonFa("btn_edit_geom_validate", {
      icon: "check",
      action: et._l(et.dialogGeomValidate),
    });

    et._el_button_geom_repair = elButtonFa("btn_edit_geom_repair", {
      icon: "user-md",
      action: et._l(et.dialogGeomRepair),
    });

    /**
     * Toolbox
     */
    et._el_menu_tools = et._button_dropdown("btn_edit_menu_tools", {
      position: "top",
      content: [
        et._el_button_add_column,
        et._el_button_add_column_identity,
        et._el_button_remove_column,
        et._el_button_rename_column,
        et._el_button_duplicate_column,
        et._el_button_add_row,
        et._el_button_remove_rows,
        et._el_button_geom_validate,
        et._el_button_geom_repair,
        et._el_button_stat,
        et._el_button_colums_order,
      ],
    });

    /**
     * User stat
     */
    et._el_users_stat = el("ul");
    et._el_users_stat_wrapper = el("small", [
      tt("edit_table_users_stat"),
      et._el_users_stat,
    ]);

    et._el_row_slider = el("div", {
      class: "edit-table--row-slider",
    });
    et._el_row_slider_container = el(
      "div",
      { class: "mx-slider-container" },
      et._el_row_slider,
    );

    et._el_toolbar = el("div", { class: "edit-table--toolbar" }, [
      et._el_row_slider_container,
      et._el_checkbox_autosave,
      et._el_users_stat_wrapper,
    ]);

    et._el_updates_counter = el("span", {
      class: "edit-table--updates-counter",
      dataset: { count: 0 },
    });
    et._el_button_save.appendChild(et._el_updates_counter);

    const elModalButtons = [
      et._el_button_close,
      et._el_button_save,
      et._el_button_undo,
      et._el_button_redo,
      et._el_menu_tools,
      et._el_button_wiki,
    ];

    et._el_table = el("div", {
      id: `ht_${et._id_table}`,
      class: "edit-table--table",
    });

    et._el_table_wrapper = el(
      "div",
      {
        class: "edit-table--table-wrapper",
      },
      et._el_table,
    );

    et._el_overlay = el("div", {
      class: "edit-table--overlay",
      dataset: {
        disconnected: "Disconnected, trying to reconnect",
        disabled: "Disabled",
        locked: "Locked",
      },
    });

    et._el_progress = el("div", {
      class: "edit-table--progress",
    });
    const col = theme.getColorThemeItem("mx_ui_link");
    et._progress = new RadialProgress(et._el_progress, {
      radius: 60,
      stroke: 4,
      strokeColor: col,
      addTrack: true,
      addText: true,
    });
    et._el_content = el(
      "div",
      { class: ["mx_handsontable", "edit-table--container"] },
      et._el_overlay,
      et._el_progress,
      et._el_table_wrapper,
      et._el_toolbar,
    );
    et._el_title = el("span");
    et._modal = modalSimple({
      id: `edit_table_modal_${et.id}`,
      title: et._el_title,
      content: et._el_content,
      buttons: elModalButtons,
      style: {
        minWidth: "800px",
        top: "60px",
      },
      removeCloseButton: true,
      addBackground: true,
      noBtnGroup: true,
      onClose: () => {
        et.destroy("modal close");
      },
    });

    et._built = true;
    await et.fire("built");
  },

  /**
   * Groupped button/count update
   * @param {Number} timeout Add tiemout before update. Solve cases when the hook do not fire at the right time : adding a small delay could solve issues;
   */
  updateButtons(timeout) {
    const et = this;
    timeout = isNumeric(timeout) ? timeout : 0;
    if (!et._table_ready || timeout) {
      setTimeout(et._update_buttons_now, timeout);
    } else {
      et._update_buttons_now();
    }
  },

  _update_buttons_now() {
    const et = this;
    if (!et._table_ready) {
      return;
    }
    et.updateButtonsGeom();
    et.updateButtonSave();
    et.updateButtonsUndoRedo();
    et.updateButtonsAddRemoveColumn();
    et.updateButtonRenameColumn();
    et.updateButtonOrderColumns();
    et.updateButtonStatColumn();
    et.updateButtonAddRow();
  },

  /**
   * Groupped column add/remove update
   */
  updateButtonsAddRemoveColumn() {
    const et = this;
    et.updateButtonRemoveColumn();
    et.updateButtonAddColumn();
  },

  /**
   * Toggle undo/redo button depending on available redo/undo in the table
   */
  updateButtonsUndoRedo() {
    const et = this;
    et.clearUndoRedoNoChange();
    const hasRedo = et._ht.isRedoAvailable();
    const hasUndo = et._ht.isUndoAvailable();
    et._button_enable(et._el_button_redo, hasRedo);
    et._button_enable(et._el_button_undo, hasUndo);
  },

  /**
   * Update button geom tools
   */
  updateButtonsGeom() {
    const et = this;
    const hasGeom = et._has_geom && !et.unsaved;
    et._button_enable(et._el_button_geom_repair, hasGeom);
    et._button_enable(et._el_button_geom_validate, hasGeom);
  },

  /**
   * Toggle remove column button depending on current columns number
   */
  updateButtonRemoveColumn() {
    const et = this;
    const columns = et.getColumns();
    et._disable_remove_column =
      et.unsaved || columns.length <= et._config.min_columns;
    et._button_enable(et._el_button_remove_column, !et._disable_remove_column);
  },

  updateButtonOrderColumns() {
    const et = this;
    /* always true if no pending update, unless _button_enable use _disabled flag*/
    et._button_enable(et._el_button_colums_order, !et.unsaved);
  },

  updateButtonStatColumn() {
    const et = this;
    /* always true if no pending upadte, unless _button_enable use _disabled flag*/
    et._button_enable(et._el_button_stat, !et.unsaved);
  },

  updateButtonAddRow() {
    const et = this;
    et._button_enable(et._el_button_add_row, !et.unsaved && !et._geom_mode);
  },

  updateButtonRenameColumn() {
    const et = this;
    /* always true if no pending upadte, unless _button_enable use _disabled flag*/
    et._button_enable(et._el_button_rename_column, !et.unsaved);
  },

  /**
   * Toggle add column button depending on current columns number
   */
  updateButtonAddColumn() {
    const et = this;
    const columns = et.getColumns();
    et._disable_add_column =
      et.unsaved || columns.length > et._config.max_columns;
    et._button_enable(et._el_button_add_column, !et._disable_add_column);
    et._button_enable(et._el_button_duplicate_column, !et._disable_add_column);
  },

  /**
   * Toggle save button depending on auto_save and updates number
   */
  updateButtonSave() {
    const et = this;
    const hasAutoSave = et._auto_save;
    const n = et.countUpdateValid();
    const hasNoUpdates = n === 0;
    const disable = hasNoUpdates || hasAutoSave;
    et._el_updates_counter.dataset.count = n;
    et._button_enable(et._el_button_save, !disable);
  },

  /**
   * Update members state info
   */
  updateMembersStat() {
    const et = this;
    const members = et.getMembers();
    const elFrag = new DocumentFragment();
    const groups = {};

    for (const member of members) {
      if (groups[member.id]) {
        groups[member.id].n_sessions += 1;
      } else {
        groups[member.id] = {
          n_sessions: 1,
          email: member.email,
          id: member.id,
        };
      }
    }

    for (const member of Object.values(groups)) {
      const elMember = el(
        "li",
        el("span", member.email),
        el("span", ` ( ${member.n_sessions} )`),
      );
      elFrag.appendChild(elMember);
    }
    et._el_users_stat.replaceChildren(elFrag);
  },

  /**
   * Global progress management
   */
  setProgress(percent, text) {
    const et = this;
    text = text || "";
    onNextFrame(() => {
      et._progress.update(percent, text);

      if (percent === 0) {
        et._progress.clear();
        if (et._in_progress) {
          et._in_progress = false;
          et.updateButtons();
        }
        et._el_progress.classList.remove("active");
      } else {
        if (!et._in_progress) {
          et._in_progress = true;
          et.updateButtons();
        }
        et._el_progress.classList.add("active");
      }
    });
  },

  setProgressMessage(message, from, to) {
    const et = this;
    if (message?.nParts > 1) {
      const p = message.part / message.nParts;
      const pl = et.lerp(from || 0, to || 100, p);
      et.setProgress(pl);
    }
  },

  lerp(a, b, n) {
    return (1 - n) * a + n * b;
  },

  /**
   * Wrapper for buttonEnable : use default from table editor
   * @param {Element} elBtn Button element
   * @param {Boolean} enable Enable / Disable button
   */
  _button_enable(elBtn, enable) {
    const et = this;
    return buttonEnable(
      elBtn,
      et._disabled || et._in_progress || et._geom_mode ? false : enable,
    );
  },

  /**
   * Simple button with drop down / popup wrapper
   * @param {String} key Translation key
   * @param {Object} opt Options ( passed to elButtonFa too)
   * @param {String} opt.position Drop down position : top, right, left, bottom
   * @param {Array} opt.content Drop down content
   * @return {Element}
   */
  _button_dropdown(key, opt) {
    const et = this;
    opt.action = toggleMenu;
    opt.icon = "cogs";
    const elBtn = elButtonFa(key, opt);
    const popup = new Popup({ position: "top", elAnchor: elBtn, ...opt });
    et._popups.push(popup);

    function toggleMenu() {
      popup.toggle();
    }

    return elBtn;
  },
};
