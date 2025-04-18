import * as helpers from "./mx_helpers.js";
import localforage from "localforage";
import mapboxgl from "mapbox-gl";
import { settings } from "./settings/index.js";
import { ListenerStore } from "./listener_store";
import { EventSimple } from "./event_simple";
import { HintHack } from "./hint_hack/index.js";
import { WsHandlerMapx } from "./ws_handler/ws_handler_instance.js";
import { NotifCenterMapx } from "./notif_center/nc_instance.js";
import { HighlighterMapx } from "./features_highlight/highlighter_instance";
import { Magnifier } from "./magnifier/index.js";
import { theme } from "./init_theme";
import { ProjectManager } from "./project/index.js";
import { ButtonPanelManager } from "./button_panel/manager.js";
import { ControlsPanel } from "./panel_controls/index.js";
import { SpotlightManager } from "./pixop/spotlight_manager.js";
import { MapxDraw } from "./draw/index.js";
import "./privacy/index.js";

const panels = new ButtonPanelManager();
const version = settings.version;

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
const controls = new ControlsPanel();
const draw = new MapxDraw({ controls });
const mg = new Magnifier(); // see demo.js in /magnifier package
const hinthack = new HintHack();
const project = new ProjectManager();
const ws = new WsHandlerMapx();
const nc = new NotifCenterMapx();
const highlighter = new HighlighterMapx();
const spotlight = new SpotlightManager();
const selectize = {}; // manage selectize by groups id
const editors = {};
const extend = {
  position: {},
  texteditor: {},
};
const info = {};

export {
  panels,
  controls,
  mapboxgl,
  project,
  localforage,
  selectize,
  helpers,
  listeners,
  events,
  hinthack,
  theme,
  draw,
  ws,
  nc,
  mg,
  highlighter,
  spotlight,
  initQueryParams,
  maps,
  data,
  info,
  version,
  settings,
  editors,
  extend,
};

console.log("INIT MX");
