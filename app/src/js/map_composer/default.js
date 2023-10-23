import { el } from "./../el/src/index.js";
import preset from "./data/paper_sizes.json";
const presetsFlat = Object.keys(preset).reduce((a, c) => {
  a.push(...preset[c]);
  return a;
}, []);

const dpr = window.devicePixelRatio;

/**
 *
 */
const state = {
  unit: "px",
  units: ["mm", "in", "px"],
  modes: ["layout", "preview"],
  modes_internal: ["print", "layout", "preview"],
  presets: presetsFlat,
  dpr: dpr, // keep original dpr, reset after print
  mode: "layout",
  exportTab: false,// testing : export image in a tab instead of download
  predefined_dim: "A5",
  predefined_item: {},
  page_width: 600,
  page_height: 600,
  content_scale: 1,
  legend_n_columns: 1,
  grid_snap_size: 5,
  item_height: 100,
  item_width: 200,
  scale_map: 1,
  scale_content: 1,
  workspace_height: 200,
  workspace_width: 200,
  canvas_max_area_theory: 16384 * 16384,
  canvas_max_area: 5000 * 5000,
  items: [
    {
      type: "map",
      width: 50,
      height: 20,
      options: {},
      editable: false,
    },
    {
      type: "legend",
      element: el("ul", el("li", el("label", "editable"))),
      width: 5,
      height: 10,
      editable: true,
    },
    {
      type: "title",
      text: "Title",
      width: 40,
      height: 4,
      editable: true,
    },
    {
      type: "text",
      text: "Abstract",
      width: 20,
      height: 4,
      editable: true,
    },
  ],
};

const options = {
  onDestroy: function () {},
};
export { state, options };
