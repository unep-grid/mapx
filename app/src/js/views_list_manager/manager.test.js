import { beforeEach, expect, it, vi } from "vitest";
const { data, listInit, filterDestroy } = vi.hoisted(() => ({
  data: { views: [] },
  listInit: vi.fn(),
  filterDestroy: vi.fn(),
}));
vi.mock("../nested_list/index.js", () => ({
  NestedList: class {
    init() {
      return listInit();
    }
    destroy() {}
  },
}));
vi.mock("../views_filter/index.js", () => ({
  ViewsFilter: class {
    destroy() {
      return filterDestroy();
    }
  },
}));
vi.mock("../views_builder/view_base.js", () => ({ ViewBase: class {} }));
vi.mock("../settings", () => ({
  settings: { project: { id: "A" }, mode: {} },
}));
vi.mock("../mx_helper_misc.js", () => ({ itemFlashSave: vi.fn() }));
vi.mock("../url_utils", () => ({ getQueryParameterInit: () => [] }));
vi.mock("../map_helpers", () => ({
  getMapData: () => data,
  viewModulesRemove: vi.fn(),
  getView: vi.fn(),
  viewRender: vi.fn(),
  viewsCloseAll: vi.fn(),
  viewAdd: vi.fn(),
  getViewTitleNormalized: vi.fn(),
  getViewDateModified: vi.fn(),
  viewsLayersOrderUpdate: vi.fn(),
  hasViewsActivated: vi.fn(),
  getViewJson: vi.fn(),
}));
import { ViewsListManager } from "./manager.js";
import { ViewsFilter } from "../views_filter/index.js";
beforeEach(() => {
  vi.clearAllMocks();
  data.views = [];
});
it("does not install a list after its cleanup yields to a newer project", async () => {
  let current = true;
  data.viewsFilter = new ViewsFilter();
  filterDestroy.mockImplementation(async () => {
    current = false;
  });
  const manager = new ViewsListManager({
    id: "map_main",
    views: [],
    isCurrent: () => current,
  });
  await manager.render();
  expect(listInit).not.toHaveBeenCalled();
  expect(data.views).toEqual([]);
});
it("does not tear down the still-current instance when init() is already known stale", async () => {
  const previous = new ViewsListManager({
    id: "map_main",
    views: [],
    isCurrent: () => true,
  });
  await previous.init();
  expect(listInit).toHaveBeenCalledTimes(1);
  const callsBeforeStaleInit = filterDestroy.mock.calls.length;

  const stale = new ViewsListManager({
    id: "map_main",
    views: [],
    isCurrent: () => false,
  });
  await stale.init();
  expect(filterDestroy.mock.calls.length).toBe(callsBeforeStaleInit);
});
it("does not render a stale local item or look up its DOM", async () => {
  const manager = new ViewsListManager({
    id: "map_main",
    views: [],
    isCurrent: () => false,
  });
  const element = document.createElement("div");
  await manager.handleRenderItemContent({
    el: element,
    data: { el: document.createElement("span") },
  });
  expect(element.children).toHaveLength(0);
});
