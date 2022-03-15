import * as styleDefault from './../../data/style/style_mapx.json';

let settings = {
  devicePixelRatio: 0, // updated by getPixelRatio()
  language: 'en',
  languages: ['en', 'fr', 'es', 'ar', 'ru', 'zh', 'de', 'bn', 'fa', 'ps'],
  highlightedCountries: [],
  initClosedPanels: false,
  project: {},
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
  search: {
    host: 'localhost',
    port: '8880',
    protocol: 'http://'
  },
  api: {
    host: 'api',
    port: '3333',
    host_public: 'api.mapx.org',
    port_public: '443',
    protocol: 'https:',
    upload_size_max: Math.pow(1024, 2) * 100, //100 MiB
    routes: {
      getSearchKey: '/get/search/key',
      getMirror: '/get/mirror',
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
      getFileFormatsList : '/get/file/formats/list',
      getEpsgCodesFull : '/get/epsg/codes/full',
      downloadSourceCreate: '/get/source/',
      downloadSourceGet: '/', // location given by the api
      uploadImage: '/upload/image/',
      uploadVector: '/upload/vector/',
      collectLogs: '/collect/logs/',
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
  // ⚠️ also defined in app/settings/settings-global.R
  links: {
    repositoryIssues: 'https://github.com/unep-grid/map-x-mgl/issues',
    appKnowlegdeBase: 'https://www.mapx.org/knowledge-base/'
  },
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
    //sublayer: '-@'
    sublayer: '@'
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
    colors: null
  }
};

export {settings};
