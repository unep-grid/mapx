import * as styleDefault from './../data/style/style_mapx.json';

let settings = {
  devicePixelRatio: 0, // updated by getPixelRatio()
  language: 'en',
  languages: ['en', 'fr'],
  highlightedCountries: [],
  project: '',
  logs: {
    disabled: false, // set in cookies as preferences ?
    levels: ['ERROR', 'WARNING', 'MESSAGE', 'LOG', 'USER_ACTION'],
    ids: [
      'session_end',
      'session_start',
      'view_remove',
      'view_add',
      'view_panel_click',
      'project_change',
      'language_change'
    ],
    sides: ['browser', 'app', 'api']
  },
  map: {
    id: 'map_main',
    token: '',
    maxZoom: 20,
    minZoom: 0
  },
  api: {
    host: 'api',
    port: '3333',
    host_public: 'api.mapx.org',
    port_public: '443',
    protocol: 'https:',
    upload_size_max: Math.pow(1024, 2) * 100, //100 MiB
    routes: {
      getApiSql: '/get/sql',
      getConfigMap: '/get/config/map',
      getIpInfo: '/get/ip',
      getTile: '/get/tile/{x}/{y}/{z}.mvt',
      getSourceMetadata: '/get/source/metadata/',
      getSourceSummary: '/get/source/summary/',
      getViewMetadata: '/get/view/metadata/',
      getSourceOverlap: '/get/source/overlap/',
      getSourceValidateGeom: '/get/source/validate/geom',
      getSourceTableAttribute: '/get/source/table/attribute',
      getView: '/get/view/item/',
      getViewsListByProject: '/get/views/list/project/',
      getViewsListGlobalPublic: '/get/views/list/global/public',
      downloadSourceCreate: '/get/source/',
      downloadSourceGet: '',
      uploadImage: '/upload/image/',
      uploadVector: '/upload/vector/',
      collectLogs: '/collect/logs/'
    }
  },
  // see https://github.com/unep-grid/map-x-mgl/issues/472
  paramKeysPermanent: [
    'project',
    'language',
    'lockProject',
    'style',
    'theme',
    'colors'
  ],
  links: [],
  mode: {
    static: false,
    app: false
  },
  paths: {
    sprites: 'sprites/sprite',
    fontstack: 'fontstack/{fontstack}/{range}.pbf'
  },
  style: styleDefault.default,
  layerBefore: 'mxlayers',
  separators: {
    sublayer: '_@_'
  },
  clickHandlers: [],
  maxByteJed: 300000, // 300 Kb
  maxByteFetch: 5e6, // 5MB
  user: {},
  ui: {
    colors: null
  }
};

export {settings};
