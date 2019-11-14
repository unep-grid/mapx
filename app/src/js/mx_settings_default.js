import * as styleDefault from './../data/style/style_mapx.json';

let settings = {
  dbLogLevels: ['ERROR'],
  dbLogLevelsAll: ['ERROR', 'WARNING', 'MESSAGE', 'LOG', 'USER_ACTION'],
  devicePixelRatio: 0, // updated by getPixelRatio()
  language: 'en',
  languages: ['en', 'fr'],
  highlightedCountries: [],
  project: '',
  map: {
    id: 'map_main',
    token: '',
    maxZoom: 20,
    minZoom: 0
  },
  api: {
    port: '3333',
    port_public: '8880',
    host: 'api',
    host_public: 'apidev.mapx.localhost',
    protocol: 'http:',
    upload_size_max: Math.pow(1024, 2) * 100, //100 MiB
    routes: {
      getApiSql : '/get/sql',
      getConfigMap: '/get/config/map',
      getIpInfo: '/get/ip',
      getTile: '/get/tile/{x}/{y}/{z}.mvt',
      getSourceMetadata: '/get/source/metadata/',
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
      uploadVector: '/upload/vector/'
    }
  },
  // see https://github.com/unep-grid/map-x-mgl/issues/472
  paramKeysPermanent: ['project', 'language', 'lockProject', 'style'],
  links: [],
  mode : {
    readonly : false,
    app : false
  },
  paths: {
    sprites: 'sprites/sprite'
  },
  style: styleDefault.default,
  layerBefore: 'mxlayers',
  separators: {
    sublayer: '_@_'
  },
  clickHandlers: [],
  maxByteJed: 100000, // 100 Kb
  user: {},
  ui: {
    ids: {
      idViewsListContainer: 'viewListContainer',
      idViewsList: 'viewListContent',
      idDashboardsPanel: 'mxDashboardsPanel',
      idDashboardsButton: 'btnTabDashboard',
      idDashboards: 'mxDashboards'
    }
  }
};

export {settings};
