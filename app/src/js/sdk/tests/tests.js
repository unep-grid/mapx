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
        name: 'test if array of string',
        test: (r) => {
          return t.h.isArrayOfString(r);
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

  t.check('Get / Set language', {
    ignore: ignoreGlobal,
    tests: [
      {
        name: 'test if the language is set',
        test: async () => {
          const lang = await mapx.ask('get_language');
          const langAlt = lang === 'en' ? 'ru' : 'en';
          await mapx.ask('set_language', {lang: langAlt});
          const langSet = await mapx.ask('get_language');
          const pass = langSet === langAlt;
          await mapx.ask('set_language', {lang: lang});
          return pass;
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
    init: async () => {
      const views = await mapx.ask('get_views');
      const viewsVt = views.reduce((a, v) => {
        if (v.type === 'vt') {
          a.push(v);
        }
        return a;
      }, []);
      const pos = Math.floor(Math.random() * viewsVt.length - 1);
      const view = viewsVt[pos];
      const meta = await mapx.ask('get_view_meta_vt_attribute', {
        idView: view.id
      });
      return meta;
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

  t.check('Get view vt source meta', {
    ignore: ignoreGlobal,
    init: async () => {
      const views = await mapx.ask('get_views');
      const viewsVt = views.reduce((a, v) => {
        if (v.type === 'vt') {
          a.push(v);
        }
        return a;
      }, []);
      const pos = Math.floor(Math.random() * viewsVt.length - 1);
      const view = viewsVt[pos];
      return mapx.ask('get_source_meta', {
        idSource: view.data.source.layerInfo.name
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
    timeout: 10000,
    init: async () => {
      const ids = await mapx.ask('get_views_id');
      const pos = Math.floor(Math.random() * ids.length - 1);
      const id = ids[pos];
      return mapx.ask('get_view_meta', {idView: id});
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

  t.check('Filter view by text', {
    ignore: ignoreGlobal,
    init: async () => {
      const views = await mapx.ask('get_views');
      const viewsVt = views.reduce((a, v) => {
        const isVtWithType =
          v.type === 'vt' && v.data.attribute && v.data.attribute.type;
        if (isVtWithType) {
          a.push(v);
        }
        return a;
      }, []);
      const pos = Math.floor(Math.random() * viewsVt.length - 1);
      const view = viewsVt[pos];
      await mapx.ask('open_view', {idView: view.id});
      return view;
    },
    tests: [
      {
        name: 'Set/get filter layers by text values',
        timeout: 10000,
        test: async (view) => {
          if (!t.h.isView(view)) {
            return false;
          }
          const values = view.data.attribute.table
            .map((v) => v.value)
            .filter((v) => t.h.isString(v));
          console.log(values);
          await mapx.ask('set_view_layer_filter_text', {
            idView: view.id,
            value: values
          });
          const res = await mapx.ask('get_view_layer_filter_text', {
            idView: view.id
          });
          const pass = values.reduce(
            (a, v) => (!a ? a : res.indexOf(v) > -1),
            true
          );
          await mapx.ask('close_view', {idView: view.id});
          return pass;
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
        timeout: 10000,
        test: async (r) => {
          const pos = Math.floor(Math.random() * r.length - 1);
          const newProject = r[pos].id;
          const currProject = await mapx.ask('get_project');
          return new Promise((resolve) => {
            /**
             * Reset current project after change
             * resolve true if the process succeeded.
             */
            mapx.once('settings_change', (s) => {
              if (s.new_settings.project !== newProject) {
                /**
                 * Failed
                 */
                resolve(false);
              } else {
                /**
                 * Success, reset project after views_list_updated
                 */
                mapx.once('views_list_updated', async () => {
                  await mapx.ask('set_project', {idProject: currProject});
                  resolve(true);
                });
              }
            });
            /**
             * Request project change
             */
            return mapx.ask('set_project', {idProject: newProject});
          });
        }
      }
    ]
  });

  t.check('Show edit view modal', {
    ignore: ignoreGlobal,
    init: async () => {
      const views = await mapx.ask('get_views');
      const project = await mapx.ask('get_project');
      const viewsEdit = views.reduce((a, v) => {
        if (v._edit === true && v.project === project) {
          a.push(v);
        }
        return a;
      }, []);
      const pos = Math.floor(Math.random() * viewsEdit.length - 1);
      return viewsEdit[pos];
    },
    tests: [
      {
        name: 'has editable view ',
        test: (v) => {
          return t.h.isViewEditable(v);
        }
      },
      {
        name: 'Display view edit modal',
        timeout: 10000,
        test: async (v) => {
          const editable = t.h.isViewEditable(v);
          if (!editable) {
            return false;
          }
          const show = await mapx.ask('show_modal_view_edit', {
            idView: v.id
          });
          const pass = await mapx.ask('has_el_id', {
            id: 'modalViewEdit',
            timeout: 1500
          });
          return show && pass;
        }
      }
    ]
  });

  /**
   * Run tests
   */
  t.run({
    finally: () => {
      setTimeout(() => {
        mapx.ask('close_modal_all');
      }, 3000);
    }
  });
});
