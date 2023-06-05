import * as helpers from "./mx_helpers.js";
import { version } from "./../../package.json";
import localforage from "localforage";
import mapboxgl from "mapbox-gl";
import { settings } from "./settings/index.js";
import { ListenerStore } from "./listener_store";
import { EventSimple } from "./event_simple";
import { HintHack } from "./hint_hack/index.js";
import { WsHandlerMapx } from "./ws_handler/ws_handler_instance.js";
import { NotifCenterMapx } from "./notif_center/nc_instance.js";
import { HighlighterMapx } from "./features_highlight/highlighter_instance";
import { WsToolsInstances } from "./ws_tools";
import { theme } from "./init_theme";
import { ProjectManager } from "./project/index.js";
import { panel_tools } from "./panel_controls/instance.js";

const templates = {
  viewListOptions: require("../dot/view_list_options.dot.html"),
  viewListControls: require("../dot/view_list_controls.dot.html"),
  viewListFilters: require("../dot/view_list_filters.dot.html"),
};

const maps = {};
const data = {
  geojson: localforage.createInstance({
    name: "geojson",
  }),
  draft: localforage.createInstance({
    name: "draft",
  }),
};

const initQueryParams = {}; // set in init_common.js
const listeners = new ListenerStore();
const events = new EventSimple();
const hinthack = new HintHack();
const project = new ProjectManager();
const ws = new WsHandlerMapx();
const nc = new NotifCenterMapx();
const highlighter = new HighlighterMapx();
const ws_tools = new WsToolsInstances(ws); //Tools using websocket
const selectize = {};
const editors = {};
const extend = {
  position: {},
  texteditor: {},
};
const info = {};
export {
  panel_tools,
  mapboxgl,
  project,
  localforage,
  selectize,
  helpers,
  listeners,
  events,
  hinthack,
  theme,
  ws,
  ws_tools,
  nc,
  highlighter,
  initQueryParams,
  templates,
  maps,
  data,
  info,
  version,
  settings,
  editors,
  extend,
};

console.log("INIT MX");
