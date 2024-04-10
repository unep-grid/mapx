import { el } from "../../el_mapx";
import { isViewId, isEmpty, isNotEmpty, isArray } from "../../is_test_mapx";
import { getViewAuto } from "../../map_helpers";
import { fetchViews } from "../../map_helpers/views_fetch";
import { miniCacheGet, miniCacheSet } from "../../minicache";
import { nc } from "../../mx";
import { path } from "../../mx_helper_misc";
import { settings } from "../../settings";
import { _get_config } from "./utils";

const def = {
  maxOptions: 50,
  selectKeys: [
    "id",
    "date_modified",
    "_title",
    "_title_project",
    "_description",
  ],
  cacheTtl: 1e3 * 60 * 10,
};

export const config = {
  valueField: "id",
  searchField: def.selectKeys,
  allowEmptyOption: true,
  options: null,
  closeAfterSelect: true,
  sortField: { field: "_title" },
  preload: "focus",
  dropdownParent: "body",
  maxItems: 10,
  maxOptions: def.maxOptions,
  plugins: ["remove_button"],
  onInitialize: null,
  create: create,
  loadThrottle: 50,
  createFilter: isViewId,
  load: load,
  render: {
    option: renderOption,
    item: renderItem,
  },
  // internal
  loader_config: {
    includeAllPublic: false,
    types: ["vt", "rt", "cc"],
  },
};

export function getConfig(options) {
  return _get_config(config, options);
}

function renderItem(view, escape) {
  const title = escape(view._title);
  const titleProject = escape(view._title_project);

  return el(
    "div",
    // remove button will be added here
    el(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
        },
      },
      [el("span", title), el("span", { class: ["text-muted"] }, titleProject)],
    ),
  );
}

function renderOption(view, escape) {
  const title = escape(view._title);
  const titleProject = escape(view._title_project);
  const description = escape(view._description || "");
  const date = new Date(escape(view.date_modified)).toLocaleDateString();
  return el(
    "div",
    {
      style: { padding: "20px" },
    },
    el("div", [
      el("span", title),
      el(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            lineHeight: "1.8em",
          },
        },
        [
          el("span", { class: "text-muted" }, date),
          el("span", { class: "text-muted" }, titleProject),
          el("span", { class: "text-muted" }, description.substr(0, 100)),
        ],
      ),
    ]),
  );
}

async function create(id, callback) {
  try {
    if (isViewId(id)) {
      const view = await getViewAuto(id);
      return callback(view);
    }
  } catch (e) {
    nc.open();
    nc.notify(
      {
        idGroup: "select_auto_views",
        type: "info",
        level: "error",
        message: e.message,
      },
      { open: true },
    );

    console.warn(e);
  }
  callback(null);
}

async function load(query, callback) {
  const config = this.settings;
  const idUser = settings.user.id;
  const idProject = settings.project.id;
  const key = `ts_views_${idProject}_${idUser}`;
  const views = [];
  const viewsCache = await miniCacheGet(key);
  const hasCache = isNotEmpty(viewsCache) && isArray(viewsCache);
  if (hasCache) {
    views.push(...viewsCache);
  } else {
    const { views: viewsRemote } = await fetchViews({
      includeAllPublic: config.loader_config.includeAllPublic,
      types: config.loader_config.types,
      onProgress: () => {},
    });
    views.push(...viewsRemote);
    await miniCacheSet(key, views, { ttl: def.cacheTtl });
  }

  const viewsFiltered = filterViews(query, views, def.maxOptions);

  callback(viewsFiltered);
}

function filterViews(str, views, maxOptions) {
  const strSplit = str.split(" ");
  const regex = new RegExp(`${strSplit.join("|")}`, "i");
  const keys = def.selectKeys;
  const empty = isEmpty(str);

  return views.filter((view) => {
    if (maxOptions < 1) {
      return false;
    }
    for (const k of keys) {
      const found = empty || path(view, k, "")?.match(regex);
      if (found) {
        maxOptions--;
        return true;
      }
    }
    return false;
  });
}
