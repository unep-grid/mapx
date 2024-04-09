import { el } from "../../el_mapx";
import { isEmpty } from "../../is_test";
import { isViewId } from "../../is_test";
import { getViewAuto } from "../../map_helpers";
import { fetchViews } from "../../map_helpers/views_fetch";
import { miniCacheGet, miniCacheSet } from "../../minicache";
import { path } from "../../mx_helper_misc";
import { settings } from "../../settings";
import { _get_config } from "./utils";

miniCacheGet;

miniCacheSet(key, value, opt);

const def = {
  maxOptions: 50,
  selectKeys: ["id", "_title", "_title_project", "_description"],
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
  createFilter: isViewId,
  load: load,
  render: {
    option: renderOption,
    item: renderItem,
  },
  // internal
  loader_config: {},
};

export function getConfig(options) {
  return _get_config(config, options);
}

function renderItem(view, escape) {
  return el("span", escape(view._title));
}

function renderOption(view, escape) {
  return el("span", escape(view._title));
}

async function create(id, callback) {
  if (!isViewId(id)) {
    return;
  }
  const view = await getViewAuto(id);
  callback(view);
}

async function load(query, callback) {
  const config = this.settings;
  const idUser = settings.user.id;
  const idProject = settings.project.id;
  const key = `ts_views_${idProject}_${idUser}`;
  let views = await miniCacheGet(key);
  if (isEmpty(views)) {
    views = await fetchViews({
      includeAllPublic: config.loader_config.includeAllPublic,
    });
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
