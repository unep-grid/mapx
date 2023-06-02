import * as noUiSlider from "https://unpkg.com/nouislider@15.7.0/dist/nouislider.mjs";
import TomSelect from "https://unpkg.com/tom-select@2.2.2/dist/esm/tom-select.complete.js";
import { AnimationButton } from "./animation_button.js";
import { Manager } from "/dist/mxsdk.module.js";

const idView = "MX-JZE39-E53LZ-0IIHP"; // somalia acled 2017
const idAttrNum = "fatalities";
const idAttrText = "actor1";

const mapx = new Manager({
  container: document.getElementById("mapx"),
  url: {
    host: "dev.mapx.localhost",
    port: 8880,
  },
  static: true,
  verbose: false,
  params: {
    theme: "water_dark",
    views: [idView],
    zoomToViews: true,
    closePanels: true,
  },
});

mapx.on("mapx_ready", async () => {
  /**
   * Opacity
   */
  const elOpacity = document.getElementById("setOpacity");
  const elOpacityResult = document.getElementById("resOpacity");
  const sliderOpacity = noUiSlider.create(elOpacity, {
    start: 1,
    range: { min: 0, max: 1 },
    step: 0.05,
  });
  sliderOpacity.on("update", updateOpacity);
  updateOpacity();
  async function updateOpacity(values) {
    if (!values) {
      values = [1];
    }
    const opacity = values[0] * 1;
    try {
      await mapx.ask("set_view_layer_transparency", {
        idView: idView,
        value: opacity,
      });
      const opacityEffective = await mapx.ask("get_view_layer_transparency", {
        idView: idView,
      });
      elOpacityResult.innerText = `${Math.round(opacityEffective * 100)}%`;
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Text
   */
  const elText = document.getElementById("setText");
  const elTextResult = document.getElementById("resText");
  const summaryText = await mapx.ask("get_view_source_summary", {
    idView,
    idAttr: idAttrText,
  });
  const table = summaryText?.attribute_stat?.table || [];
  const choices = table
    .sort((a, b) => b.count - a.count)
    .map((r) => {
      return {
        value: r.value,
        label: `${r.value} ( ${r.count})`,
      };
    });

  new TomSelect(elText, {
    maxItems: 10,
    valueField: "value",
    labelField: "label",
    searchField: ["value"],
    options: choices,
    onChange: async function (values) {
      await mapx.ask("set_view_layer_filter_text", {
        idView,
        values,
        attribute: idAttrText,
      });
      const textEffective = await mapx.ask("get_view_layer_filter_text", {
        idView: idView,
      });
      elTextResult.innerText = textEffective.length;
    },
  });

  /**
   * Numeric
   */
  const summaryNum = await mapx.ask("get_view_source_summary", {
    idView,
    idAttr: idAttrNum,
  });
  const elNumeric = document.getElementById("setNumeric");
  const elNumericResult = document.getElementById("resNumeric");
  const max = summaryNum.attribute_stat.max;
  const min = summaryNum.attribute_stat.min;
  const sliderNumeric = noUiSlider.create(elNumeric, {
    start: [min, max],
    range: { min: min, max: max },
    connect: true,
    behaviour: "drag",
    step: 1,
  });
  sliderNumeric.on("update", updateNumeric);
  updateNumeric();
  async function updateNumeric(values) {
    if (!values) {
      values = [min, max];
    }
    const from = values[0] * 1;
    const to = values[1] * 1;
    try {
      const attribute = "fatalities";
      await mapx.ask("set_view_layer_filter_numeric", {
        idView,
        from,
        to,
        attribute,
      });
      const numericEffective = await mapx.ask("get_view_layer_filter_numeric", {
        idView: idView,
      });
      elNumericResult.innerText = JSON.stringify(numericEffective);
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Time slider
   */
  const elTime = document.getElementById("setTime");
  const elTimeResult = document.getElementById("resTime");
  const start = summaryNum.extent_time.min;
  const end = summaryNum.extent_time.max;
  const week = 60 * 60 * 24 * 7;
  const hasT0 = summaryNum.attributes.includes("mx_t0");
  const hasT1 = summaryNum.attributes.includes("mx_t1");

  const sliderTime = noUiSlider.create(elTime, {
    start: [start, end],
    range: { min: start, max: end },
    step: week,
    behaviour: "drag",
    connect: true,
  });
  new AnimationButton({
    element: document.getElementById("btnAnimTime"),
    onValueChange: (value) => {
      sliderTime.set([start, value]);
    },
    framerate : 10,
    duration: 2,
    startValue: start,
    endValue: end,
    mirror: true,
    infinite: true,
  });
  sliderTime.on("update", updateTime);
  updateTime();

  async function updateTime(values) {
    try {
      if (!values) {
        values = [start, end];
      }
      const from = Math.round(values[0] * 1000);
      const to = Math.round(values[1] * 1000);
      await mapx.ask("set_view_layer_filter_time", {
        idView,
        from,
        to,
        hasT0,
        hasT1,
      });
      const timeEffective = await mapx.ask("get_view_layer_filter_time", {
        idView: idView,
      });
      const timeFrom = new Date(timeEffective[0]).toLocaleDateString();
      const timeTo = new Date(timeEffective[1]).toLocaleDateString();
      elTimeResult.innerText = `${timeFrom}-${timeTo}`;
    } catch (e) {
      console.warn(e);
    }
  }
});
