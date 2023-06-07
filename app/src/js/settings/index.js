import * as styleDefault from "./../../data/style/style_mapx.json";
import * as routesExpress from "./routes_express.json";
import * as routesWs from "./routes_ws.json";

const routes = Object.assign({}, routesWs.default, routesExpress.default);

const settings = {
  title: "MapX",
  devicePixelRatio: 0, // updated by getPixelRatio()
  language: "en",
  languages: ["en", "fr", "es", "ar", "ru", "zh", "de", "bn", "fa", "ps"],
  highlightedCountries: [],
  initClosedPanels: false,
  project: {},
  projection: {
    name: "mercator",
    center: [0, 0],
    parallels: [0, 0],
  },
  // special values map
  valuesMap: {
    // Used in view text filter, i.e viewSetTextFilter
    null: "$NULL",
  },
  logs: {
    disabled: false, // set in cookies as preferences ?
    levels: ["ERROR", "WARNING", "MESSAGE", "LOG", "USER_ACTION"],
    ids: [
      "session_end",
      "session_start",
      "view_remove",
      "view_add",
      "view_panel_click",
      "project_change",
      "language_change",
    ],
    sides: ["browser", "app", "api"],
  },
  map: {
    id: "map_main",
    token: "",
    maxZoom: 20,
    minZoom: 0,
  },
  search: {
    host: "localhost",
    port: "8880",
    protocol: "http://",
  },
  cdn: {
    template: "https://cdn.jsdelivr.net/gh/unep-grid/mapx@{{version}}/{{path}}",
  },
  tiles: {
    vector: {
      useCache: true,
      usePostgisTiles: null,
    },
  },
  // overwritten by settings-global.R
  api: {
    host: "api",
    port: "3333",
    host_public: "api.mapx.org",
    port_public: "443",
    protocol: "https:",
    upload_size_max: Math.pow(1024, 2) * 200, //100 MiB
    routes: routes,
  },
  // see https://github.com/unep-grid/mapx/issues/472
  paramKeysPermanent: [
    "project",
    "language",
    "lockProject",
    "style",
    "theme",
    "colors",
    "sdkToken",
  ],
  // ⚠️ also defined in app/settings/settings-global.R
  links: {
    mapboxSprites: "mapbox://sprites/mapbox/bright-v8",
    mapboxGlyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    repositoryIssues: "https://github.com/unep-grid/mapx/issues",
    appKnowlegdeBase: "https://www.mapx.org/knowledge-base/",
    wiki: "https://github.com/unep-grid/mapx/wiki/",
    wikiRaw: "https://raw.githubusercontent.com/wiki/unep-grid/mapx/",
  },
  mode: {
    static: false,
    app: false,
  },
  paths: {
    static: "/static.html",
    sprites: "sprites/sprite",
    fontstack: "fontstack/{fontstack}/{range}.pbf",
    svg: "sprites/svg/",
  },
  style: styleDefault.default,
  layerBefore: "mxlayers",
  separators: {
    sublayer: "@",
  },
  clickHandlers: [],
  maxByteJed: 300000, // 300 Kb
  maxByteFetch: 5e6, // 5MB
  maxTimeFetch: 1000 * 60, // 1 minute
  maxTimeCache: 1000 * 60 * 60 * 24, // aka ttl = 1 day
  //maxTimeCache : 1, // aka ttl = 1 day
  useCache: true,
  user: {},
  ui: {
    colors: null,
  },
};

export { settings };
