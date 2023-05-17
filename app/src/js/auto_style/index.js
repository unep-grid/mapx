import { isNumeric, isFunction, isViewId, isView } from "./../is_test";
import { getViewTitle } from "./../map_helpers";
import { getViewSourceSummary } from "./../mx_helper_source_summary";
import {
  el,
  elAuto,
  elPanel,
  elCheckbox,
  elSelect,
  elInput,
  elSpanTranslate,
} from "../el_mapx/index.js";
import { getDictItem } from "../language";
import { itemFlashSave } from "../mx_helper_misc";
import { modal } from "../mx_helper_modal.js";
import { RadioGroup } from "../radio_group/index.js";
import chroma from "chroma-js";
import { createState } from "../state/index.js";
import "./style.less";

const stateDefault = {
  idView: null,
  nullValue: null,
  binsMethod: "jenks",
  binsNumber: 5,
  title: null,
  reversePalette: false,
  mergeLabelByRow: false,
  palette: "purd",
  type: null,
  mode: "colors", // sizes
  color: "#fff",
  sizeMax: 10,
  sizeMin: 10,
};

export class AutoStyle {
  constructor(config) {
    const as = this;
    if (config) {
      as.init(config).catch((e) => console.error(e));
    }
  }
  async init(config, cb) {
    const as = this;
    as._elsParts = [];
    as._elsInputs = [];
    as._data = {};
    as._buttons = [];
    as._closed = false;
    as._cb = (table, state) => {
      if (isFunction(cb)) {
        return cb(table, state);
      } else {
        console.log(table, state);
      }
    };

    if (!isViewId(config.idView) && !isView(config.idView)) {
      throw new Error("AutoStyle need a view or view id");
    }

    /**
     * set default
     */
    as._state = createState(Object.assign({}, stateDefault, config));
    const state = as._state;

    if (!state.title) {
      state.title = getViewTitle(state.idView) || state.idView;
    }

    if (!state.type) {
      /**
       * Init : get type
       */
      const summary = await getViewSourceSummary(state.idView, {
        useCache: false,
        nullValue: state.nullValue,
        stats: ["base", "attributes"],
      });
      state.type = summary.attribute_stat.type;
    }

    as.build();

    await as.setMode();
    await as.update();
  }
  close() {
    if (as._closed) {
      return;
    }
    as._closed = true;
    as.modal.close();
  }
  clean() {
    const as = this;
    as._rgPalette.destroy();
  }
  async update() {
    const as = this;
    const state = as._state;
    const summary = await getViewSourceSummary(state.idView, {
      useCache: false,
      nullValue: state.nullValue,
      stats: ["base", "attributes"],
      binsNumber: state.binsNumber,
      binsMethod: state.binsMethod,
    });
    const aStat = summary.attribute_stat;
    as._data = aStat;

    /**
     * Scale palette and set colors
     */
    const palette = chroma.brewer[state.palette].map((c) => c); // clone
    if (state.reversePalette === true) {
      palette.reverse();
    }
    const colors = chroma.scale(palette).colors(aStat.table.length);

    let i;
    for (const row of aStat.table) {
      row.color = colors[i++];
      /**
       * Round value for display
       * Create preview
       */
      for (const k in row) {
        if (isNumeric(row[k])) {
          row[k] = Math.round(row[k] * 1000) / 1000;
        }
        if (k === "color") {
          row.preview = el("div", {
            style: {
              backgroundColor: row[k],
              width: "20px",
              height: "20px",
              border: "1px solid ccc",
              borderRadius: "5px",
            },
          });
        }
      }
    }
    as.updateElTable();
  }

  updateElTable() {
    const as = this;
    const aStat = as._data;

    const count = aStat.table.reduce((c, r) => {
      return c + r.count;
    }, 0);

    let titleTable = "";

    if (aStat.type === "continuous") {
      titleTable = `${titleTable} ( Method : ${aStat.binsMethod}, number of bins : ${aStat.binsNumber}, count ${count} )`;
    } else {
      titleTable = `${titleTable} ( count: ${count} ) `;
    }

    /**
     * Build / Update table
     */
    const elTable = elAuto("array_table", aStat.table, {
      tableTitle: titleTable,
      tableContainerHeaderClass: ["panel-heading", "panel-heading-light"],
    });
    as._elTableContainer.innerHTML = "";
    as._elTableContainer.appendChild(elTable);
  }

  build() {
    const as = this;
    as.buildModeSelect();
    as.buildBinsSelect();
    as.buildSizesInputs();
    as.buildRadioGroup();
    as.buildPaletteReverse();
    as.buildElCheckMergeLabelByRow();
    as.buildLayout();
  }

  buildLayout() {
    const as = this;
    const state = as._state;
    const elInputsContainer = as.buildInputsContainer();
    as._elsParts.push(elInputsContainer);
    as._elTableContainer = el("div");
    as._elsParts.push(as._elTableContainer);
    as.buildButtonDone();
    as._elContent = el("div", { class: "auto_style" }, as._elsParts);
    /**
     * Modal
     */
    as._modal = modal({
      title: state.title,
      content: as._elContent,
      noShinyBinding: true,
      addSelectize: false,
      addBackground: true,
      onClose: as.clean.bind(as),
      buttons: as._buttons,
    });
  }

  /**
   * Input mode "sizes" :
   * - min
   * - max
   * - color
   */
  buildSizesInputs() {
    const as = this;
    as._elSizeMin = elInput("auto_style_sizes_min", {
      type: "number",
      value: 10,
      class: "auto_style__input_sizes",
      action: async (e) => {
        as._state.sizeMin = Number(e.target.value);
      },
    });
    as._elSizeMax = elInput("auto_style_sizes_max", {
      type: "number",
      value: 10,
      class: "auto_style__input_sizes",
      action: async (e) => {
        as._state.sizeMax = Number(e.target.value);
      },
    });
    as._elColor = elInput("auto_style_color", {
      type: "color",
      value: "#0f0",
      class: "auto_style__input_sizes",
      action: async (e) => {
        as._state.color = chroma(e.target.value).css();
      },
    });
    as._elsInputs.push(as._elSizeMin, as._elSizeMax, as._elColor);
  }

  buildBins() {
    const as = this;
    const state = as._state;
    const elValidNum = el("span", { class: ["help-block"] });
    as._elNBins = elInput("auto_style_bins_number", {
      type: "number",
      value: state.binsNumber,
      class: "auto_style__input_sizes",
      action: async (e) => {
        const value = Number(e.target.value);
        // see  api/utils/checkRouteParams_rules.js
        if (value < 1 || value > 100) {
          elValidNum.innerText = "Value must be >= 1 and <= 100";
          as._elNbins.classList.add("has-error");
          return;
        } else {
          elValidNum.innertext = "";
          as._elNbins.classList.remove("has-error");
        }
        state.binsNumber = value;
        await as.update();
      },
    });
    as._elNBins.appendChild(elValidNum);

    if (state.type === "continuous") {
      as._elsInputs.push(as._elNBins);
    }
  }

  buildModeOptions() {
    const as = this;
    const state = as._state;
    return ["colors", "sizes"].map((m) => {
      const label = getDictItem(m);
      const elOpt = el("option", { value: m }, label);
      if (m === state.mode) {
        elOpt.setAttribute("selected", "true");
      }
      return elOpt;
    });
  }
  /**
   * Mode
   */
  buildModeSelect() {
    const as = this;
    const elModeOptions = as.buildModeOptions();
    as._elModeSelect = elSelect("auto_style_select_mode", {
      items: elModeOptions,
      action: async (e) => {
        await as.setMode(e.target.value);
      },
    });
    as._elsInputs.push(...[as._elModeSelect]);
  }

  async setMode(mode) {
    const as = this;
    const state = as._state;

    if (mode) {
      state.mode = mode;
    }

    if (state.mode === "sizes") {
      as._elContent.classList.add(`auto_style__mode_sizes`);
      as._elContent.classList.remove(`auto_style__mode_colors`);
    } else {
      as._elContent.classList.add(`auto_style__mode_colors`);
      as._elContent.classList.remove(`auto_style__mode_sizes`);
    }

    await as.update();
  }

  buildBinsOptions() {
    const as = this;
    const state = as._state;
    return ["jenks", "heads_tails", "quantile", "equal_interval"].map((m) => {
      const label = getDictItem(m);
      const elOpt = el("option", { value: m }, label);
      if (m === state.binsMethod) {
        elOpt.setAttribute("selected", "true");
      }
      return elOpt;
    });
  }

  buildBinsSelect() {
    const as = this;
    const state = as._state;
    const elBinsOptions = as.buildBinsOptions();
    as._elBinsSelect = elSelect("auto_style_select_bins", {
      items: elBinsOptions,
      action: async (e) => {
        state.binsMethod = e.target.value;
        await as.update();
      },
    });
    if (state.type === "continuous") {
      as._elsInputs.push(as._elBinsSelect);
    }
  }

  buildPalettes() {
    return Object.keys(chroma.brewer).map((k) => {
      return {
        value: k,
        content: chroma.brewer[k].map((c) =>
          el("span", {
            style: { height: "10px", width: "10px", backgroundColor: c },
          })
        ),
      };
    });
  }

  buildRadioGroup() {
    const as = this;
    const state = as._state;
    const palettes = as.buildPalettes();
    as._rgPalette = new RadioGroup({
      items: palettes,
      onUpdate: async (palette) => {
        state.palette = palette;
        await as.update();
      },
      builder: (item) => {
        return el(
          "div",
          {
            style: {
              display: "flex",
              padding: "5px",
              alignItems: "center",
              justifyContent: "space-between",
            },
          },
          el(
            "span",
            {
              style: {
                marginRight: "5px",
              },
            },
            item.value
          ),
          el(
            "div",
            {
              class: "auto_style_palettes",
              style: { display: "flex", flexDirection: "row" },
            },
            item.content
          )
        );
      },
      configForm: {
        class: ["auto_style__input_colors", "auto_style__palettes"],
      },
    });

    as._elsInputs.push(as._rgPalette.el);
  }

  buildPaletteReverse() {
    const as = this;
    const state = as._state;
    const rgPalette = as._rgPalette;
    as._elCheckPaletteReverse = elCheckbox("auto_style_check_reverse_color", {
      checked: false,
      class: ["auto_style__input_colors"],
      action: async (e) => {
        state.reversePalette = e.target.checked === true;
        /**
         * Update UI
         */
        const elsPalettes = rgPalette.el.querySelectorAll(
          ".auto_style_palettes"
        );
        if (elsPalettes.length) {
          for (const elPalette of elsPalettes) {
            elPalette.style.flexDirection =
              e.target.checked === true ? "row-reverse" : "row";
          }
        }
        /**
         * Update table
         */
        await as.update();
      },
    });

    as._elsInputs.push(as._elCheckPaletteReverse);
  }

  buildElCheckMergeLabelByRow() {
    const as = this;
    const state = as._state;
    as._elCheckMergeLabelByRow = elCheckbox("auto_style_check_preserve_label", {
      checked: false,
      action: (e) => {
        state.mergeLabelByRow = e.target.checked === true;
      },
    });
    as._elsInputs.push(as._elCheckMergeLabelByRow);
  }

  buildInputsContainer() {
    const as = this;
    return elPanel({
      title: "Settings",
      classHeader: ["panel-heading", "panel-heading-light"],
      content: el("div", { style: { padding: "10px" } }, as._elsInputs),
    });
  }

  buildButtonDone() {
    const as = this;
    const state = as._state;
    const elBtnDone = el(
      "button",
      {
        type: "button",
        class: ["btn", "btn-default"],
        on: [
          "click",
          () => {
            as._cb(as._data, state);
            itemFlashSave();
          },
        ],
      },
      elSpanTranslate("auto_style_button_update")
    );
    as._buttons.push(elBtnDone);
  }
}
