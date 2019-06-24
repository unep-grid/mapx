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
    routes: {
      tiles: '/get/tile/{x}/{y}/{z}.mvt',
      views: '/get/view/',
      sourceMetadata: '/get/source/metadata/',
      viewMetadata: '/get/view/metadata/',
      sourceOverlap: '/get/source/overlap/',
      sourceValidateGeom: '/get/source/validate/geom',
      getSourceTableAttribute: '/get/source/table/attribute',
      getViews: '/get/views/',
      downloadSourceCreate: '/get/source/',
      downloadSourceGet: '',
      uploadImage: '/upload/image/',
      uploadVector: '/upload/vector/'
    }
  },
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
  maxByteUpload: Math.pow(1024, 2) * 100, //100 MiB
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
