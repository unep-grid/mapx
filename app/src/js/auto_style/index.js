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
import { itemFlashSave, lerp } from "../mx_helper_misc";
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
  geomType: "point",
  mode: "colors", // sizes
  allowModeSizes: false,
  color: "#00ff00",
  sizeMax: 40,
  sizeMin: 10,
  size: 10,
  opacity: 0.7,
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
      useCache: true,
      nullValue: state.nullValue,
      stats: ["base", "attributes"],
      binsNumber: state.binsNumber,
      binsMethod: state.binsMethod,
    });
    const aStat = summary.attribute_stat;
    as._data = aStat;

    const opacity = state.opacity;
    const table = aStat.table;
    const mode = state.mode;
    const palette = chroma.brewer[state.palette].map((c) => c); // clone
    if (state.reversePalette === true) {
      palette.reverse();
    }
    const colors = chroma.scale(palette).colors(aStat.table.length);
    const min = 0;
    const max = table.length - 1;

    const minSize = state.sizeMin;
    const maxSize = state.sizeMax;
    const size = state.size;

    for (let i = 0, iL = aStat.table.length; i < iL; i++) {
      const row = aStat.table[i];

      row.opacity = opacity;

      if (mode === "colors") {
        row.color = colors[i];
        if (state.allowModeSizes) {
          row.size = size;
        }
      }
      if (mode === "sizes") {
        const ll = lerp;
        if (state.allowModeSizes) {
          row.size = ll(minSize, maxSize, min, max, i);
        }
        row.color = state.color;
      }
      /**
       * Round value for display
       * Create preview
       */
      for (const k in row) {
        if (isNumeric(row[k])) {
          row[k] = Math.round(row[k] * 1000) / 1000;
        }
        if (k === "color") {
          const dim = {};
          switch (state.geomType) {
            case "line":
              dim.width = `100%`;
              dim.height = `${row.size}px`;
              dim.radius = `0px`;
              break;
            case "point":
              dim.height = `${row.size}px`;
              dim.width = `${row.size}px`;
              dim.radius = `50%`;
              break;
            default:
              dim.height = `20px`;
              dim.width = `20px`;
              dim.radius = `0px`;
          }

          row.preview = el(
            "div",
            {
              style: {
                maxHeight: "100px",
                maxWidth: "100px",
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              },
            },
            el("span", {
              style: {
                backgroundColor: chroma(row[k]).alpha(opacity),
                width: dim.width,
                height: dim.height,
                borderRadius: dim.radius,
              },
            })
          );
        }
      }
    }
    as.updateElTable();
  }

  updateElTable() {
    const as = this;
    const aStat = as._data;
    const state = as._state;
    const count = aStat.table.reduce((c, r) => {
      return c + r.count;
    }, 0);

    let elTitleTable = "";

    if (state.type === "continuous") {
      elTitleTable = elSpanTranslate("auto_style_title_table_continuous", {
        data: {
          method: state.binsMethod,
          bins: state.binsNumber,
        },
      });
    } else {
      elTitleTable = elSpanTranslate("auto_style_title_table_categorical", {
        data: {
          count: count,
        },
      });
    }

    /**
     * Build / Update table
     */
    const elTable = elAuto("array_table", aStat.table, {
      tableTitle: elTitleTable,
      tableContainerHeaderClass: ["panel-heading", "panel-heading-light"],
    });
    as._elTableContainer.innerHTML = "";
    as._elTableContainer.appendChild(elTable);
  }

  build() {
    const as = this;
    as.buildModeSelect();
    as.buildBinsSelect();
    as.buildBins();
    as.buildSizesInputs();
    as.buildOpacityInput();
    as.buildPalettes();
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

    if (!state.allowModeSizes) {
      as._elContent.classList.add(`auto_style__no_sizes`);
    }

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
   * Opacity
   */
  buildOpacityInput() {
    const as = this;
    as._elOpacity = elInput("auto_style_opacity", {
      type: "range",
      value: as._state.opacity,
      attributes: {
        min: 0,
        max: 1,
        step: 0.05,
      },
      class: "auto_style__input_opacity",
      action: async (e) => {
        as._state.opacity = Number(e.target.value);
        await as.update();
      },
    });

    as._elsInputs.push(as._elOpacity);
  }

  /**
   * Input mode "sizes" :
   * - min
   * - max
   * - color
   */
  buildSizesInputs() {
    const as = this;
    as._elSize = elInput("auto_style_size", {
      type: "number",
      value: as._state.size,
      class: "auto_style__input_size",
      action: async (e) => {
        let value = Math.abs(Math.ceil(Number(e.target.value)));
        if (!isNumeric(value)) {
          value = as._state.size;
        }
        as._state.size = value;
        e.target.value = value;
        await as.update();
      },
    });
    as._elSizeMin = elInput("auto_style_sizes_min", {
      type: "number",
      value: as._state.sizeMin,
      class: "auto_style__input_sizes",
      action: async (e) => {
        let value = Math.abs(Math.ceil(Number(e.target.value)));
        if (!isNumeric(value)) {
          value = as._state.sizeMin;
        }
        as._state.sizeMin = value;
        e.target.value = value;
        await as.update();
      },
    });
    as._elSizeMax = elInput("auto_style_sizes_max", {
      type: "number",
      value: as._state.sizeMax,
      class: "auto_style__input_sizes",
      action: async (e) => {
        let value = Math.abs(Math.ceil(Number(e.target.value)));
        if (!isNumeric(value)) {
          value = as._state.sizeMax;
        }
        as._state.sizeMax = value;
        e.target.value = value;
        await as.update();
      },
    });

    as._elColor = elInput("auto_style_color", {
      type: "color",
      value: chroma(as._state.color).hex(),
      class: "auto_style__input_sizes",
      action: async (e) => {
        as._state.color = chroma(e.target.value).hex();
        await as.update();
      },
    });
    as._elsInputs.push(as._elSize, as._elSizeMin, as._elSizeMax, as._elColor);
  }

  buildBins() {
    const as = this;
    const state = as._state;
    const elValidNum = el("span", { class: ["help-block"] });
    as._elNBins = elInput("auto_style_bins_number", {
      type: "number",
      value: state.binsNumber,
      action: async (e) => {
        const value = Math.abs(Math.ceil(Number(e.target.value)));
        // see  api/utils/checkRouteParams_rules.js
        const valid = value > 1 && value < 100;

        if (!valid) {
          e.target.value = as._state.binsNumber;
          //no change
          return;
        } else {
          e.target.value = value; // 2.4 -> 2
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
    const modes = state.allowModeSizes ? ["colors", "sizes"] : ["colors"];
    return modes.map((m) => {
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
      value: state.binsMethod,
      action: async (e) => {
        state.binsMethod = e.target.value;
        await as.update();
      },
    });
    if (state.type === "continuous") {
      as._elsInputs.push(as._elBinsSelect);
    }
  }

  getPalettes() {
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

  buildPalettes() {
    const as = this;
    const state = as._state;
    const palettes = as.getPalettes();
    as._rgPalette = new RadioGroup({
      items: palettes,
      value: state.palette,
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
      checked: state.reversePalette,
      class: ["auto_style__input_colors"],
      action: async (e) => {
        await update(e);
        await as.update();
      },
    });
    // initial palette order
    update();
    as._elsInputs.push(as._elCheckPaletteReverse);

    // update flex direction
    async function update(e) {
      if (e instanceof Event) {
        state.reversePalette = !!e.target?.checked === true;
      }
      const elsPalettes = rgPalette.el.querySelectorAll(".auto_style_palettes");
      if (elsPalettes.length) {
        for (const elPalette of elsPalettes) {
          elPalette.style.flexDirection = state.reversePalette
            ? "row-reverse"
            : "row";
        }
      }
    }
  }

  buildElCheckMergeLabelByRow() {
    const as = this;
    const state = as._state;
    as._elCheckMergeLabelByRow = elCheckbox("auto_style_check_preserve_label", {
      checked: state.mergeLabelByRow,
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
