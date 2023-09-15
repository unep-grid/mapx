const elContainer = document.getElementById("mapx");
const elResults = document.getElementById("results");
const mapx = new mxsdk.Manager({
  container: elContainer,
  url: { protocol: "http", host: "dev.mapx.localhost", port: 8880 },
  style: {
    minHeight: "800px",
    minWidth: "800px",
    width: "100%",
  },
  params: {
    project: "MX-A3M-LVK-V7S-XOT-J48",
    zoomMin: 0,
    zoomMax: 22,
  },
});

mapx.on("message", (message) => {
  if (message.level === "log") {
    console.info(`%c 🤓 ${message.text}`, "color: #76bbf7");
  } else if (message.level === "message") {
    console.info(`%c 😎 ${message.text}`, "color: #70e497");
  } else if (message.level === "warning") {
    console.info(`%c 🥴 ${message.text}`, "color: #d09c23");
  } else if (message.level === "error") {
    console.info(`%c 🤬 ${message.text}`, "color: #F00");
  }
});
const groups = new window.URL(window.location.href).searchParams.get("groups");
const titles = new window.URL(window.location.href).searchParams.get("titles");
const t = new mxsdk.Testing({
  container: elResults,
  title: "mapx sdk test",
  groups: groups ? groups.split(",") : [],
  titles: titles ? titles.split(",") : [],
});
/**
 * MapX respond
 */
async function stopIfGuest() {
  const isGuest = await mapx.ask("is_user_guest");
  if (isGuest) {
    const token = prompt(`\
       Please enter a valid MapX app ecrypted token to use this tool : 
       some tests require authentication.
       If you don't have such token, you can get one with the "get_token" method 
       or in a MapX instance on the same domain, "mx.helpers.getToken()"
      `);
    if (token) {
      await mapx.ask("set_token", token);
      window.location.reload();
    }
    return t.stop("Need logged user");
  }
}

async function waitAsync(d) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), d);
  });
}

mapx.once("ready", async () => {
  await stopIfGuest();

  t.check("Get list methods", {
    init: () => {
      return mapx.ask("get_sdk_methods");
    },
    tests: [
      {
        name: "test if array of string",
        test: (methods) => {
          return t.valid.isArrayOfString(methods);
        },
      },
    ],
  });

  t.check("Chaos views display 1", {
    tests: [
      {
        name: "Adding / removing views in random order during a specified duration",
        timeout: 60 * 1000,
        test: async () => {
          return mapx.ask("launch_chaos_test", {
            run: 5,
            batch: 5,
            run_timeout: 10 * 1000,
          });
        },
      },
    ],
  });

  t.check("panels", {
    init: async () => {
      return mapx.ask("panels_list");
    },
    tests: [
      {
        name: "set/get/state of panels",
        test: async (ids) => {
          const init = {};

          for (const id of ids) {
            const open = await mapx.ask("panels_is_open", { id });
            const hidden = await mapx.ask("panels_is_hidden", { id });
            init[id] = { open, hide: hidden };
          }

          const state = await mapx.ask("panels_state");

          if (!t.valid.isEqual(state, init)) {
            return false;
          }

          await mapx.ask("panels_open_all");

          const openAll = [];

          for (const id of ids) {
            const open = await mapx.ask("panels_is_open", { id });
            openAll.push(open);
          }

          await mapx.ask("panels_hide_all");

          const hideAll = [];

          for (const id of ids) {
            const hidden = await mapx.ask("panels_is_hidden", { id });
            hideAll.push(hidden);
          }

          await mapx.ask("panels_batch", init);

          const pass =
            hideAll.every((i) => i === true) &&
            openAll.every((i) => i === true);
          return pass;
        },
      },
    ],
  });

  t.check("Views layer order", {
    init: async () => {
      const views = await mapx.ask("get_views");
      const n = 15;
      let i = 0;
      const select = [];
      for (const view of views) {
        if (t.valid.isViewVtWithRules(view) && ++i <= n) {
          await mapx.ask("view_add", { idView: view.id });
          select.push(view.id);
        }
      }

      return { select };
    },
    tests: [
      {
        name: "Set order",
        test: async (r) => {
          await mapx.ask("set_views_layer_order", {
            order: r.select,
          });
          return true;
        },
      },
      {
        name: "Get order",
        test: async (r) => {
          const ordered = await mapx.ask("get_views_layer_order");
          if (r.select.length !== ordered.length) {
            return false;
          }
          for (let i = 0; i < r.select.length; i++) {
            if (r.select[i] !== ordered[i]) {
              return false;
            }
          }
          return true;
        },
      },
      {
        name: "Set random order",
        test: async (r) => {
          /**
           * Assumes views id are random, sorting by id = sorting by random
           */
          const sorted = r.select.toSorted();
          await mapx.ask("set_views_layer_order", { order: sorted });
          const ordered = await mapx.ask("get_views_layer_order");
          for (let i = 0; i < sorted.length; i++) {
            if (sorted[i] !== ordered[i]) {
              return false;
            }
          }
          return true;
        },
      },
      {
        name: "Clean",
        test: async (r) => {
          /**
           * Assumes views id are random, sorting by id = sorting by random
           */
          for (const idView of r.select) {
            await mapx.ask("view_remove", { idView });
          }
          const result = await mapx.ask("get_views_layer_order");
          return t.valid.isEmpty(result);
        },
      },
    ],
  });

  t.check("highlighter", {
    init: async () => {
      const res = {};
      const resp = await fetch("data/iceland_test.geojson");
      const gj = await resp.json();
      const view = await mapx.ask("view_geojson_create", { data: gj });
      res.boundsOrig = await mapx.ask("map_get_bounds_array");
      await mapx.ask("map_jump_to", {
        center: [-18.785, 65.267],
        zoom: 6,
      });
      res.view = view;
      return res;
    },
    tests: [
      {
        name: "position wait",
        test: () => {
          // map_jump_to return after move_end
          // the view is there, but queryRenderedFeatures returns nothing
          return waitAsync(1000);
        },
      },
      {
        name: "filter none",
        test: async (res) => {
          const count = await mapx.ask("set_highlighter", {
            filters: [
              {
                id: res.view.id,
                filter: [
                  "any",
                  [">", ["get", "amount"], 100],
                  ["in", ["get", "id_4"], ["literal", ["x", "y"]]],
                ],
              },
            ],
          });
          return count === 0;
        },
      },
      {
        name: "filter all",
        test: async () => {
          const count = await mapx.ask("set_highlighter", {
            all: true,
          });
          return count === 3;
        },
      },
      {
        name: "filter one",
        test: async (res) => {
          const count = await mapx.ask("set_highlighter", {
            filters: [
              {
                id: res.view.id,
                filter: [
                  "all",
                  [">", ["get", "amount"], 20],
                  ["in", ["get", "id_4"], ["literal", ["a", "b"]]],
                ],
              },
            ],
          });
          return count === 1;
        },
      },

      {
        name: "filter one update",
        test: async () => {
          const count = await mapx.ask("update_highlighter");
          return count === 1;
        },
      },
      {
        name: "filter reset",
        test: async () => {
          const count = await mapx.ask("reset_highlighter");
          return count === 0;
        },
      },
      {
        name: "Reset bounds",
        test: async (res) => {
          await mapx.ask("map_set_bounds_array", {
            bounds: res.boundsOrig,
          });
          return true;
        },
      },
    ],
  });

  t.check("Set theme", {
    init: async () => {
      const res = {};
      res.themes = await mapx.ask("get_themes");
      res.idTheme = await mapx.ask("get_theme_id");
      res.idThemes = await mapx.ask("get_themes_ids");
      return res;
    },
    tests: [
      {
        name: "theme wait",
        test: () => {
          return waitAsync(1000);
        },
      },
      {
        name: "all themes",
        test: async (res) => {
          // all themes
          for (const id of res.idThemes) {
            await mapx.ask("add_theme", {
              theme: res.themes[id],
            });
            await waitAsync(200);
          }
          // orig theme
          await mapx.ask("add_theme", {
            theme: res.themes[res.idTheme],
          });
          return true;
        },
      },
    ],
  });

  t.check("Set max bounds", {
    init: async () => {
      const res = {};
      res.boundsMax = await mapx.ask("map_get_max_bounds_array");
      res.boundsOrig = await mapx.ask("map_get_bounds_array");
      // sri lanka
      res.boundsTest = [77.9602, 5.7703, 83.169, 9.8485];
      res.boundsTestWrong = [83.169, 9.8485, 77.9602, 5.7703];
      return res;
    },
    tests: [
      {
        name: "Set max bounds",
        test: async (res) => {
          const done = await mapx.ask("map_set_max_bounds_array", {
            bounds: res.boundsTest,
          });
          return done;
        },
      },
      {
        name: "Get max bounds",
        test: async (res) => {
          const bounds = await mapx.ask("map_get_max_bounds_array");

          if (bounds.length !== res.boundsTest.length) {
            return false;
          }

          for (let i = 0; i < bounds.length; i++) {
            if (bounds[i] !== res.boundsTest[i]) {
              return false;
            }
          }
          return true;
        },
      },
      {
        name: "Set max wrong bounds",
        test: async (res) => {
          const done = await mapx.ask("map_set_max_bounds_array", {
            bounds: res.boundsTestWrong,
          });
          return done;
        },
      },
      {
        name: "Get max bounds bis",
        test: async (res) => {
          const bounds = await mapx.ask("map_get_max_bounds_array");

          if (bounds.length !== res.boundsTest.length) {
            return false;
          }

          for (let i = 0; i < bounds.length; i++) {
            if (bounds[i] !== res.boundsTest[i]) {
              return false;
            }
          }
          return true;
        },
      },
      {
        name: "Reset bounds",
        test: async (res) => {
          await mapx.ask("map_set_max_bounds_array", {
            bounds: res.boundsMax,
          });
          await mapx.ask("map_set_bounds_array", {
            bounds: res.boundsOrig,
          });
          return true;
        },
      },
    ],
  });

  t.check("Sharing module", {
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["vt", "rt", "sm", "cc"],
      });
      await mapx.ask("show_modal_share", {
        idView: view.id,
      });
      return {
        id: view.id,
      };
    },
    tests: [
      {
        name: "has valid url with view id",
        test: async (r) => {
          const urlString = await mapx.ask("get_modal_share_string");
          const url = new URL(urlString);
          const hasId = url.searchParams.get("views") === r.id;
          return hasId;
        },
      },
      {
        name: "test suite work",
        test: async () => {
          const ok = await mapx.ask("get_modal_share_tests");
          return ok;
        },
      },
      {
        name: "can be closed",
        test: async () => {
          const hadModal = await mapx.ask("close_modal_share");
          await mapx.ask("close_modal_all");
          return hadModal;
        },
      },
    ],
  });

  t.check("Table editor", {
    init: async () => {
      return mapx.ask("get_sources_list_edit");
    },
    tests: [
      {
        name: "All sources id are valid ",
        test: (res) => {
          return res.list.reduce((a, c) => a && t.valid.isSourceId(c.id), true);
        },
      },
      {
        name: "Editor is running",
        test: async (res) => {
          const sourcesSelect = res.list.filter((s) => s.nrow > 10);
          const pos = Math.floor(Math.random() * (sourcesSelect.length - 1));
          const idTable = res.list[pos]?.id;
          res._id_table = idTable;
          const state = await mapx.ask("table_editor_open", {
            id_table: idTable,
            test_mode: true,
          });
          res._state = state;
          return state.initialized && state.built;
        },
      },
      {
        name: "Second editor can't be added, previous one returned",
        test: async (res) => {
          const state = await mapx.ask("table_editor_open", {
            id_table: res._id_table,
            test_mode: true,
          });
          /*
           * Id is unique and shoult match previous editor
           */
          return state.id === res._state.id;
        },
      },
      {
        name: "Lock unlock enable disable",
        test: async (res) => {
          /**
           * Lock
           */
          await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "lock",
          });
          const s_1 = await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "state",
          });
          if (!s_1.locked) {
            return false;
          }
          /**
           * Unlock
           */
          await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "unlock",
          });
          const s_2 = await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "state",
          });
          if (s_2.locked) {
            return false;
          }
          /**
           * Disable
           */
          await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "disable",
          });
          const s_3 = await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "state",
          });
          if (!s_3.disabled) {
            return false;
          }
          /**
           * Enable
           */
          await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "enable",
          });
          const s_4 = await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "state",
          });
          if (s_4.disabled) {
            return false;
          }
          return true;
        },
      },
      {
        name: "Editor : add column",
        test: async (res) => {
          res._column_add = "_mx_test_column";
          const update = {
            type: "add_column",
            id_table: res._id_table,
            column_name: res._column_add,
            column_type: "numeric",
          };
          await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "handlerUpdateColumnAdd",
            value: update,
          });
          const columns = await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "getColumns",
          });
          const colNames = columns.map((col) => col.data);
          if (!colNames.includes(res._column_add)) {
            return false;
          }

          return true;
        },
      },
      {
        name: "Editor : handle invalid values",
        test: async (res) => {
          const cellsError = [];
          const cellsValid = [];
          const enabled = await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "setAutoSave",
            value: false,
          });

          if (enabled) {
            return false;
          }

          const column_id = await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "getColumnId",
            value: res._column_add,
          });

          if (t.valid.isEmpty(column_id)) {
            return false;
          }

          const dim = await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "getTableDimension",
          });

          const nCells = dim.rows > 100 ? 100 : dim.rows;

          for (let i = 0; i < nCells; i++) {
            cellsError.push([i, column_id, "bad_" + i]);
            cellsValid.push([i, column_id, i]);
          }

          const sanStatErrors = await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "setCellsWaitSanitize",
            value: {
              cells: cellsError,
              source: "testing",
            },
          });

          if (sanStatErrors.nError !== nCells) {
            return false;
          }

          const sanStatValid = await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "setCellsWaitSanitize",
            value: {
              cells: cellsValid,
              source: "testing",
            },
          });

          if (sanStatValid.nValid !== nCells) {
            return false;
          }

          return true;
        },
      },
      {
        name: "Editor : remove column",
        test: async (res) => {
          const update = {
            type: "remove_column",
            id_table: res._id_table,
            column_name: res._column_add,
            column_type: "boolean",
          };

          await mapx.ask("table_editor_exec", {
            id_table: res._id_table,
            method: "handlerUpdateColumnRemove",
            value: update,
          });
          const columnsAfter = await mapx.ask("table_editor_exec", {
            idTable: res._id_table,
            method: "getColumns",
          });
          const colNamesAfter = columnsAfter.map((col) => col.data);
          if (colNamesAfter.includes(res._column_add)) {
            return false;
          }
          return true;
        },
      },

      {
        name: "Editor closed",
        test: async (res) => {
          const id_table = res._id_table;
          const state = await mapx.ask("table_editor_close", { id_table });
          return state.destroyed;
        },
      },
    ],
  });

  t.check("Full websocket communication", {
    init: async () => {
      return mapx.ask("tests_ws");
    },
    tests: [
      {
        name: "All tests should be true ",
        test: (res) => {
          return res === true;
        },
      },
    ],
  });

  t.check("Generic map methods", {
    tests: [
      {
        name: "test set/get background colors",
        test: async () => {
          const newColor = "rgb(255,238,34)";
          const origColor = await mapx.ask("map", {
            method: "getPaintProperty",
            parameters: ["background", "background-color"],
          });
          const okNew = await mapx.ask("map", {
            method: "setPaintProperty",
            parameters: ["background", "background-color", newColor],
          });
          const controlColor = await mapx.ask("map", {
            method: "getPaintProperty",
            parameters: ["background", "background-color"],
          });
          const okReset = await mapx.ask("map", {
            method: "setPaintProperty",
            parameters: ["background", "background-color", origColor],
          });
          const resetColor = await mapx.ask("map", {
            method: "getPaintProperty",
            parameters: ["background", "background-color"],
          });
          return (
            okNew &&
            okReset &&
            controlColor === newColor &&
            resetColor === origColor
          );
        },
      },
    ],
  });

  t.check("Common loc", {
    init: () => {
      return mapx.ask("common_loc_get_list_codes");
    },
    tests: [
      {
        name: "test if array of string",
        test: (codes) => {
          return t.valid.isArrayOfString(codes);
        },
      },
      {
        name: "test 20 random common locations",
        timeout: 20000,
        test: async function (codes) {
          const item = this;
          const now = performance.now();
          const n = 20;
          const l = codes.length;
          const bounds = await mapx.ask("map_get_bounds_array");
          await mapx.ask("map_wait_idle");
          for (let i = 0; i < n; i++) {
            if (performance.now() - now > item.timeout) {
              return;
            }
            const r = Math.floor(Math.random() * l);
            const c = codes[r];
            const bbx = await mapx.ask("common_loc_fit_bbox", {
              code: i % 2 ? c : [c],
              param: { duration: 200 },
            });
            const bbxA = await mapx.ask("map_get_bounds_array");
            /**
             *                 n
             *     ┌──────┬────────┬──────┐
             *     │      │    n   │      │
             *     │      │        │      │
             *   w │      │w      e│      │ e
             *     │      │        │      │
             *     │      │    s   │      │
             *     └──────┴────────┴──────┘
             *                 s
             * NOTE: mapbox do not allow south < -86 and north > 86, which
             * means.. validation could fail with
             */
            const included =
              bbx[0] >= Math.floor(bbxA[0]) && // w
              (bbx[1] >= Math.floor(bbxA[1]) || bbx[1] >= -90) && // s
              bbx[2] <= Math.ceil(bbxA[2]) && // e
              (bbx[3] <= Math.ceil(bbxA[3]) || bbx[3] <= 90); // n
            if (!included) {
              return false;
            }
          }
          await mapx.ask("map_set_bounds_array", { bounds });
          return true;
        },
      },
    ],
  });

  t.check("Immersive mode", {
    init: async () => {
      return mapx.ask("set_immersive_mode", { enable: true });
    },
    tests: [
      {
        name: "initial state",
        test: async (state) => {
          return !!state;
        },
      },
      {
        name: "switch state",
        test: async () => {
          let state = await mapx.ask("get_immersive_mode");
          if (state !== true) {
            return false;
          }
          state = await mapx.ask("set_immersive_mode", { enable: false });
          if (state !== false) {
            return false;
          }
          state = await mapx.ask("get_immersive_mode");
          if (state !== false) {
            return false;
          }
          return true;
        },
      },
    ],
  });

  t.check("Get views list", {
    init: () => {
      return mapx.ask("get_views");
    },
    tests: [
      {
        name: "is array of views",
        test: (views) => {
          return t.valid.isArrayOfViews(views);
        },
      },
    ],
  });

  t.check("Trigger login window", {
    init: async () => {
      await stopIfGuest();
      return mapx.ask("show_modal_login");
    },
    tests: [
      {
        name: "has login modal",
        test: async () => {
          const pass = await mapx.ask("has_el_id", {
            id: "loginCode",
            timeout: 500,
          });
          await mapx.ask("close_modal_all");
          return pass;
        },
      },
    ],
  });

  t.check("Get / Set language", {
    tests: [
      {
        name: "test if the language is set",
        test: async () => {
          const lang = await mapx.ask("get_language");
          const langAlt = lang === "en" ? "ru" : "en";
          await mapx.ask("set_language", { lang: langAlt });
          const langSet = await mapx.ask("get_language");
          const pass = langSet === langAlt;
          await mapx.ask("set_language", { lang: lang });
          return pass;
        },
      },
    ],
  });

  t.check("Get views id list", {
    init: () => {
      return mapx.ask("get_views_id");
    },
    tests: [
      {
        name: "is array of views id",
        test: (idViews) => {
          return t.valid.isArrayOfViewsId(idViews);
        },
      },
    ],
  });

  t.check("set_get_view_legend", {
    init: async () => {
      const views = [];
      for (let i = 0; i < 10; i++) {
        const view = await mapx.ask("_get_random_view", {
          type: ["vt"],
          vtHasRules: true,
          vtAttributeType: "string",
        });
        views.push(view);
      }
      return views;
    },
    tests: [
      {
        name: "Set/Get view legend values",
        test: async (views) => {
          let pass = null;
          for (const view of views) {
            if (pass === false) {
              return;
            }

            await mapx.ask("view_add", { idView: view.id });
            const values = await mapx.ask("get_view_legend_values", {
              idView: view.id,
            });
            const last = values[values.length - 1];
            await mapx.ask("set_view_legend_state", {
              idView: view.id,
              values: last,
            });
            const returned = await mapx.ask("get_view_legend_state", {
              idView: view.id,
            });

            const ok = returned.includes(last);
            await mapx.ask("view_remove", { idView: view.id });
            pass = t.valid.isEmpty(pass) ? ok : pass && ok;
          }
          return pass;
        },
      },
    ],
  });

  t.check("Get views with active layers on map", {
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["vt", "rt"],
        rtHasTiles: true,
        vtHasRules: true,
      });
      await mapx.ask("view_add", { idView: view.id });
      const ids = await mapx.ask("get_views_with_visible_layer");
      await mapx.ask("view_remove", { idView: view.id });
      return {
        ids: ids,
        id: view.id,
      };
    },
    tests: [
      {
        name: "is array of views id",
        test: (r) => {
          return t.valid.isArrayOfViewsId(r.ids);
        },
      },
      {
        name: "id in ids",
        test: (r) => {
          const hasId = r.ids.indexOf(r.id) > -1;
          return hasId;
        },
      },
    ],
  });

  t.check("Set view order", {
    init: async () => {
      await mapx.ask("set_views_list_sort", { asc: true, mode: "text" });
    },
    tests: [
      {
        name: "Order is ok",
        test: async () => {
          const sorted_desc = await mapx.ask("is_views_list_sorted", {
            asc: false,
            mode: "text",
          });
          const sorted_asc = await mapx.ask("is_views_list_sorted", {
            asc: true,
            mode: "text",
          });
          return sorted_asc && sorted_desc;
        },
      },
    ],
  });

  t.check("Get view vt attribute meta", {
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["vt"],
        vtHasRules: true,
      });
      const meta = await mapx.ask("get_view_meta_vt_attribute", {
        idView: view.id,
      });
      return meta;
    },
    tests: [
      {
        name: "is object",
        test: (r) => {
          return t.valid.isObject(r);
        },
      },
    ],
  });

  t.check("Get view table attribute config", {
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["vt"],
        vtHasRules: true,
      });
      const config = await mapx.ask("get_view_table_attribute_config", {
        idView: view.id,
      });
      return config;
    },
    tests: [
      {
        name: "is object",
        test: (r) => {
          return t.valid.isObject(r);
        },
      },
    ],
  });

  t.check("Get view table attribute url", {
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["vt"],
        vtHasRules: true,
      });
      const url = await mapx.ask("get_view_table_attribute_url", {
        idView: view.id,
      });
      return url;
    },
    tests: [
      {
        name: "is url",
        test: (r) => {
          return t.valid.isUrl(r);
        },
      },
    ],
  });

  t.check("Get view table attribute", {
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["vt"],
        vtHasRules: true,
      });
      const data = await mapx.ask("get_view_table_attribute", {
        idView: view.id,
      });
      return data;
    },
    tests: [
      {
        name: "is array of object",
        test: (r) => {
          return t.valid.isArrayOfObject(r);
        },
      },
    ],
  });

  t.check("Get view vt source meta", {
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["vt"],
        vtHasRules: true,
      });
      const idSource = view?.data?.source?.layerInfo?.name;
      return mapx.ask("get_source_meta", {
        idSource: idSource,
      });
    },
    tests: [
      {
        name: "is object",
        test: (r) => {
          return t.valid.isObject(r);
        },
      },
    ],
  });

  t.check("Get view rt or vt legend", {
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["vt", "rt"],
        vtHasRules: true,
        rtHasLegendLink: true,
      });
      return mapx.ask("get_view_legend_image", { idView: view.id });
    },
    tests: [
      {
        name: "is base 64 image",
        test: (png) => {
          return t.valid.isBase64img(png);
        },
      },
    ],
  });

  t.check("Get view meta", {
    timeout: 10000,
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["rt", "vt", "sm", "cc"],
      });
      return mapx.ask("get_view_meta", { idView: view.id });
    },
    tests: [
      {
        name: "is object with meta key",
        test: (r) => {
          return t.valid.isObject(r) && t.valid.isObject(r.meta);
        },
      },
    ],
  });

  t.check("Get user id", {
    init: () => {
      return mapx.ask("get_user_id");
    },
    tests: [
      {
        name: "is numeric",
        test: (r) => {
          return t.valid.isNumeric(r);
        },
      },
    ],
  });

  t.check("Get user ip", {
    init: () => {
      return mapx.ask("get_user_ip");
    },
    tests: [
      {
        name: "is object",
        test: (r) => {
          return t.valid.isObject(r);
        },
      },
    ],
  });

  t.check("Get user roles", {
    init: () => {
      return mapx.ask("get_user_roles");
    },
    tests: [
      {
        name: "is object",
        test: (r) => {
          return t.valid.isObject(r);
        },
      },
    ],
  });

  t.check("Get user email", {
    init: async () => {
      await stopIfGuest();
      return mapx.ask("get_user_email");
    },
    tests: [
      {
        name: "is email",
        test: (r) => {
          return t.valid.isEmail(r);
        },
      },
    ],
  });

  t.check("Filter view by text", {
    group: "filters",
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["vt"],
        vtHasAttributeType: "string",
      });
      if (!t.valid.isView(view)) {
        return t.stop("Need at least a vt view with string attribute");
      }
      return view;
    },
    tests: [
      {
        name: "Set/get filter layers by text values",
        timeout: 30000,
        test: async (view) => {
          if (!t.valid.isView(view)) {
            return false;
          }
          await mapx.ask("view_add", { idView: view.id });
          const summary = await mapx.ask("get_view_source_summary", {
            idView: view.id,
            stats: ["attributes"],
            idAttr: view?.data?.attribute?.name,
          });
          const values = summary.attribute_stat.table.map((row) => row.value);
          await mapx.ask("set_view_layer_filter_text", {
            idView: view.id,
            value: values,
          });
          const res = await mapx.ask("get_view_layer_filter_text", {
            idView: view.id,
          });
          const pass = values.every((v) => res.includes(v));
          await mapx.ask("view_remove", { idView: view.id });
          return pass;
        },
      },
    ],
  });

  t.check("Get collection by project", {
    init: () => {
      return mapx.ask("get_project_collections");
    },
    tests: [
      {
        name: "is array",
        test: (r) => {
          return t.valid.isArray(r);
        },
      },
    ],
  });

  t.check("Set dashboard visibility", {
    init: async () => {
      const view = await mapx.ask("_get_random_view", {
        type: ["vt", "rt", "cc"],
        hasDashboard: true,
      });
      await mapx.ask("view_add", { idView: view.id });
      return view;
    },
    tests: [
      {
        name: "Dashboard is added then, removed properly",
        test: async (view) => {
          let visible = false;
          let removed = false;
          const hasDashboard = await mapx.ask("has_dashboard");
          if (hasDashboard) {
            await mapx.ask("set_dashboard_visibility", {
              show: true,
            });
            visible = await mapx.ask("is_dashboard_visible");
            await mapx.ask("set_dashboard_visibility", {
              show: false,
            });
          }
          await mapx.ask("view_remove", { idView: view.id });
          removed = !(await mapx.ask("is_dashboard_visible"));
          return hasDashboard && visible && removed;
        },
      },
    ],
  });

  t.check("Get collection of open views", {
    init: async () => {
      const views = await mapx.ask("get_views");
      const view = views.find((v) => {
        return (
          t.valid.isArray(v.data.collections) && v.data.collections.length > 0
        );
      });
      await mapx.ask("view_add", { idView: view.id });
      return view;
    },
    tests: [
      {
        name: "View collections match",
        test: async (view) => {
          const collectionAfter = await mapx.ask("get_project_collections", {
            open: true,
          });
          await mapx.ask("view_remove", { idView: view.id });
          const diff = d(collectionAfter, view.data.collections);
          const pass = diff.length === 0;
          return pass;
          function d(a, b) {
            var bSet = new Set(b);
            return a.filter(function (x) {
              return !bSet.has(x);
            });
          }
        },
      },
    ],
  });

  t.check("Load projects", {
    init: () => {
      return mapx.ask("get_projects");
    },
    tests: [
      {
        name: "is array of projects",
        test: (r) => {
          return t.valid.isProjectsArray(r);
        },
      },
      {
        name: "Change project",
        timeout: 10000,
        test: async (r) => {
          const pos = Math.floor(Math.random() * (r.length - 1));
          const newProject = r[pos].id;
          const currProject = await mapx.ask("get_project");
          const success = await mapx.ask("set_project", {
            idProject: newProject,
          });
          if (success) {
            return mapx.ask("set_project", { idProject: currProject });
          } else {
            return false;
          }
        },
      },
    ],
  });

  t.check("Show edit view modal", {
    init: async () => {
      await stopIfGuest();
      const view = await mapx.ask("_get_random_view", {
        type: ["vt", "rt", "cc", "sm"],
        isEditable: true,
        isLocal: true,
      });
      if (!t.valid.isView(view)) {
        return t.stop("Need at least a vt view wit string attribute");
      }
      return view;
    },
    tests: [
      {
        name: "has editable view ",
        test: (v) => {
          return t.valid.isViewEditable(v);
        },
      },
      {
        name: "Display view edit modal",
        timeout: 10000,
        test: async (v) => {
          const editable = t.valid.isViewEditable(v);
          if (!editable) {
            return false;
          }
          const show = await mapx.ask("show_modal_view_edit", {
            idView: v.id,
          });
          const pass = await mapx.ask("has_el_id", {
            id: "modalViewEdit",
            timeout: 1500,
          });
          await mapx.ask("close_modal_all");
          return show && pass;
        },
      },
    ],
  });

  t.check("Trigger map composer", {
    init: async () => {
      return mapx.ask("show_modal_map_composer");
    },
    tests: [
      {
        name: "has map_composer panel",
        test: async () => {
          const pass = await mapx.ask("has_el_id", {
            id: "map_composer",
            timeout: 1500,
          });
          await mapx.ask("close_modal_all");
          return pass;
        },
      },
    ],
  });

  t.check("Trigger download view source : vt", {
    init: async () => {
      await stopIfGuest();
      const view = await mapx.ask("_get_random_view", {
        type: ["vt"],
        isDownloadble: true,
      });
      const done = await mapx.ask("download_view_source_vector", {
        idView: view.id,
      });
      return done;
    },
    tests: [
      {
        name: "Correctly added",
        test: (done) => {
          return done === true;
        },
      },
      {
        name: "Corectly removed",
        test: async () => {
          const closed = await mapx.ask("close_modal_download_vector");
          return closed;
        },
      },
    ],
  });

  t.check("GeoJSON create view download geojson data", {
    init: async () => {
      const view = await mapx.ask("view_geojson_create", {
        random: { n: 100 },
        save: false,
      });
      const res = await mapx.ask("download_view_source_geojson", {
        idView: view.id,
      });
      return {
        data: res.data,
        id: view.id,
      };
    },
    tests: [
      {
        name: "has data",
        test: (res) => {
          return res.data.features.length === 100;
        },
      },
      {
        name: "has layers",
        test: async (res) => {
          const visibles = await mapx.ask("get_views_with_visible_layer");
          return visibles.includes(res.id);
        },
      },
      {
        name: "properly removed",
        test: async (res) => {
          const removed = await mapx.ask("view_geojson_delete", {
            idView: res.id,
          });
          return removed;
        },
      },
    ],
  });

  t.check("Tools - add new view", {
    init: async () => {
      await stopIfGuest();
      return mapx.ask("show_modal_tool", { tool: "view_new" });
    },
    tests: [
      {
        name: "has modal",
        test: async (ok) => {
          if (!ok) {
            return false;
          }
          const hasModalEl = await mapx.ask("has_el_id", {
            id: "createNewView",
            timeout: 2000,
          });
          await mapx.ask("close_modal_all");
          return hasModalEl;
        },
      },
    ],
  });

  t.check("Chaos views display 2", {
    tests: [
      {
        name: "Adding / removing views in random order during a specified duration",
        timeout: 60 * 1000,
        test: async () => {
          return mapx.ask("launch_chaos_test", {
            run: 5,
            batch: 5,
            run_timeout: 10 * 1000,
          });
        },
      },
    ],
  });

  /**
   * Run tests
   */
  t.run({
    finally: () => {
      console.log("Tests finished");
      const resTable = t._results.map((r) => {
        return {
          title: r.title,
          message: r.message,
          n_tests: r.tests.length,
          passes: r.tests.reduce((a, c) => a && c.success, true),
        };
      });
      console.table(resTable);
    },
  });
});
