import { el } from "../../el_mapx";
import { isViewId, isEmpty, isArrayOfViews } from "../../is_test_mapx";
import { getViewAuto, getViewsListHash } from "../../map_helpers";
import { fetchViews } from "../../map_helpers/views_fetch";
import { miniCacheGet, miniCacheSet } from "../../minicache";
import { nc } from "../../mx";
import { settings } from "../../settings";
import { _get_config } from "./utils";

const localCache = {
  viewsPromiseCache: {},
};

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
  plugins: ["remove_button", "drag_drop"],
  onInitialize: null,
  create: create,
  loadThrottle: 50,
  createFilter: isViewId,
  load: load,
  onInitialize: function () {
    const tom = this;
    tom._options_handler = options_handler.bind(tom);
  },
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
    /*
     * remove button will be added here
     */
    el("div", [
      el("span", title),
      el("span", { class: ["text-muted", "space-around"] }, titleProject),
    ]),
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

async function options_handler(idViews) {
  const ts = this;
  for (const idView of idViews) {
    if (isViewId(idView)) {
      const view = await getViewAuto(idView);
      ts.addOption(view);
    }
  }
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

async function load(_, callback) {
  try {
    const config = this.settings.loader_config;
    const cacheKey = generateCacheKey(
      settings.user.id,
      settings.project.id,
      settings.language,
    );

    const noPendingPromise = !localCache.viewsPromiseCache[cacheKey];
    if (noPendingPromise) {
      localCache.viewsPromiseCache[cacheKey] = fetchViewsFromCacheOrRemote(
        config,
        cacheKey,
      ).finally(() => delete localCache.viewsPromiseCache[cacheKey]);
    }
    const views = await localCache.viewsPromiseCache[cacheKey];
    callback(views);
  } catch (error) {
    console.error("Error loading views:", error);
    callback([]);
  }
}

async function fetchViewsFromCacheOrRemote(
  { types, includeAllPublic },
  cacheKey,
) {
  const cachedViews = await miniCacheGet(cacheKey);
  if (isArrayOfViews(cachedViews)) {
    return cachedViews;
  }
  return fetchAndCacheViews(
    types,
    includeAllPublic,
    cacheKey,
    settings.language,
  );
}

async function fetchAndCacheViews(
  types,
  includeAllPublic,
  cacheKey,
  language = "en",
) {
  const { views } = await fetchViews({ types, includeAllPublic, language });
  await miniCacheSet(cacheKey, views, { ttl: def.cacheTtl });
  return views;
}

function generateCacheKey(userId, projectId, language) {
  const hash = getViewsListHash();
  return `ts_views_${projectId}_${userId}_${language}_${hash}`;
}
