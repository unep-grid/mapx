const elContainer = document.getElementById('mapx');
const elResults = document.getElementById('results');
const mapx = new mxsdk.Manager({
  container: elContainer,
  url: 'http://dev.mapx.localhost:8880/?project=MX-3ZK-82N-DY8-WU2-IGF'
});
const t = new mxsdk.Testing({
  container: elResults,
  title: 'mapx sdk test'
});

const ignoreGlobal = false;

const expectedMethods = [
  'get_sdk_methods',
  'set_panel_left_visibility',
  'get_views',
  'get_views_id',
  'get_view_meta_vt_attribute',
  'get_view_meta',
  'get_user_id',
  'get_user_ip',
  'get_user_roles',
  'get_user_email',
  'set_project',
  'get_language',
  'get_languages',
  'get_projects',
  'get_project',
  'get_project_collections',
  'is_guest',
  'set_view_layer_filter_text',
  'set_view_layer_filter_numeric',
  'set_view_layer_filter_time',
  'set_view_layer_transparency',
  'get_view_layer_filter_numeric',
  'get_view_layer_filter_time',
  'get_view_layer_transparency',
  'open_view',
  'close_view',
  'show_modal_login',
  'show_modal_view_meta',
  'close_modal_all'
];
/**
 * MapX respond
 */
mapx.once('ready', () => {
  t.check('Get list methods', {
    ignore: ignoreGlobal,
    init: () => {
      return mapx.ask('get_sdk_methods');
    },
    tests: [
      {
        name: 'test if all expected methods are listed',
        test: (r) => {
          return r.reduce((a, m) => {
            return a === false ? a : expectedMethods.indexOf(m) > -1;
          }, true);
        }
      }
    ]
  });
  t.check('Get views list', {
    ignore: ignoreGlobal,
    init: () => {
      return mapx.ask('get_views');
    },
    tests: [
      {
        name: 'is array of views',
        test: (r) => {
          return t.h.isViewsArray(r);
        }
      }
    ]
  });

  t.check('Get views id list', {
    ignore: ignoreGlobal,
    init: () => {
      return mapx.ask('get_views_id');
    },
    tests: [
      {
        name: 'is array',
        test: (r) => {
          return t.h.isArray(r);
        }
      }
    ]
  });

  t.check('Get view vt attribute meta', {
    ignore: ignoreGlobal,
    init: () => {
      return mapx.ask('get_views').then((views) => {
        views = views.reduce((a, v) => {
          if (v.type === 'vt') {
            a.push(v);
          }
          return a;
        }, []);
        const pos = Math.floor(Math.random() * views.length - 1);
        const view = views[pos];
        return mapx.ask('get_view_meta_vt_attribute', {idView: view.id});
      });
    },
    tests: [
      {
        name: 'is object',
        test: (r) => {
          return t.h.isObject(r);
        }
      }
    ]
  });

  t.check('Get view meta', {
    ignore: ignoreGlobal,
    timeout : 1000,
    init: () => {
      return mapx.ask('get_views_id').then((ids) => {
        const pos = Math.floor(Math.random() * ids.length - 1);
        const id = ids[pos];
        return mapx.ask('get_view_meta', {idView: id});
      });
    },
    tests: [
      {
        name: 'is object with meta key',
        test: (r) => {
          return t.h.isObject(r) && t.h.isObject(r.meta);
        }
      }
    ]
  });

  t.check('Get user id', {
    ignore: ignoreGlobal,
    init: () => {
      return mapx.ask('get_user_id');
    },
    tests: [
      {
        name: 'is numeric',
        test: (r) => {
          return t.h.isNumeric(r);
        }
      }
    ]
  });

  t.check('Get user ip', {
    ignore: ignoreGlobal,
    init: () => {
      return mapx.ask('get_user_ip');
    },
    tests: [
      {
        name: 'is object',
        test: (r) => {
          return t.h.isObject(r);
        }
      }
    ]
  });

  t.check('Get user roles', {
    ignore: ignoreGlobal,
    init: () => {
      return mapx.ask('get_user_roles');
    },
    tests: [
      {
        name: 'is object',
        test: (r) => {
          return t.h.isObject(r);
        }
      }
    ]
  });

  t.check('Get user email', {
    ignore: ignoreGlobal,
    init: () => {
      return mapx.ask('get_user_email');
    },
    tests: [
      {
        name: 'is email',
        test: (r) => {
          return t.h.isEmail(r);
        }
      }
    ]
  });

  t.check('Load projects', {
    ignore: ignoreGlobal,
    init: () => {
      return mapx.ask('get_projects');
    },
    tests: [
      {
        name: 'is array of projects',
        test: (r) => {
          return t.h.isProjectsArray(r);
        }
      },
      {
        name: 'Change project',
        timeout: 1000,
        test: (r) => {
          const pos = Math.floor(Math.random() * r.length - 1);
          const newProject = r[pos].id;
          return mapx.ask('get_project').then((currProject) => {
            return new Promise((resolve) => {
              /**
               * Reset current project after change
               * resolve true if the process succeeded.
               */
              mapx.once('settings_change', (s) => {
                if (s.new_settings.project !== newProject) {
                  resolve(false);
                } else {
                  mapx.once('views_list_updated', () => {
                    mapx
                      .ask('set_project', {idProject: currProject})
                      .then(() => {
                        resolve(true);
                      });
                  });
                }
              });
              /**
               * Request project change
               */
              mapx.ask('set_project', {idProject: newProject});
            });
          });
        }
      }
    ]
  });
});
