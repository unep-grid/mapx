let settings = {
  dbLogLevels: ['ERROR'],
  dbLogLevelsAll: ['ERROR', 'WARNING', 'MESSAGE', 'LOG', 'USER_ACTION'],
  devicePixelRatio: 0, // updated by getPixelRatio()
  language: 'en',
  languages: ['en', 'fr'],
  highlightedCountries: [],
  project: '',
  api: {
    port: '3333',
    port_public: '8880',
    host: 'api',
    host_public: 'apidev.mapx.localhost',
    protocol: 'http:',
    upload_size_max: Math.pow(1024, 2) * 100, //100 MiB
    routes: {
      getTile: '/get/tile/{x}/{y}/{z}.mvt',
      getSourceMetadata: '/get/source/metadata/',
      getViewMetadata: '/get/view/metadata/',
      getSourceOverlap: '/get/source/overlap/',
      getSourceValidateGeom: '/get/source/validate/geom',
      getSourceTableAttribute: '/get/source/table/attribute',
      getView: '/get/view/item/',
      getViewsListByProject: '/get/views/list/project/',
      getViewsListGlobalPublic:'/get/views/list/global/public',
      downloadSourceCreate: '/get/source/',
      downloadSourceGet: '',
      uploadImage: '/upload/image/',
      uploadVector: '/upload/vector/'
    }
  },
  links : [],
  modeKiosk: false,
  paths: {
    sprites: 'sprites/sprite'
  },
  style: {
    version: 8,
    name: 'mx_white',
    layers: []
  },
  map: {
    id: 'map_main',
    token: '',
    maxZoom: 20,
    minZoom: 0
  },
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

export {settings };
