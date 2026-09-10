import { beforeEach, expect, it, vi } from "vitest";
import { ViewsListUpdate } from "./index.js";
const { fetchViews, render, fire } = vi.hoisted(() => ({
  fetchViews: vi.fn(),
  render: vi.fn(),
  fire: vi.fn(),
}));
vi.mock("../init_theme", () => ({
  theme: { getColorThemeItem: () => "#000" },
}));
vi.mock("../mx_helper_misc", () => ({
  updateIfEmpty: (target, defaults) => {
    for (const [key, value] of Object.entries(defaults)) {
      if (target[key] === undefined) {
        target[key] = value;
      }
    }
  },
}));
vi.mock("../map_helpers", () => ({
  getGeoJSONViewsFromStorage: async () => [],
  getViewsFilter: vi.fn(),
  getViewsList: vi.fn(),
  layersOrderAuto: vi.fn(),
  viewAdd: vi.fn(),
}));
vi.mock("../map_helpers/views_fetch", () => ({ fetchViews }));
vi.mock("../views_list_manager", () => ({
  viewsListRenderNew: render,
  viewsListAddSingle: vi.fn(),
}));
vi.mock("../settings", () => ({ settings: { project: { id: "A" } } }));
vi.mock("../url_utils", () => ({ getQueryInit: vi.fn() }));
vi.mock("../mx", () => ({ events: { fire } }));
beforeEach(() => {
  vi.clearAllMocks();
});
it("does not render or emit completion when a project changes during fetch", async () => {
  let current = true;
  fetchViews.mockImplementation(async ({ onProgress }) => {
    current = false;
    // A stale progress callback must not discover or replace the current list DOM.
    onProgress({ loaded: 1, total: 2 });
    return { views: [], states: [] };
  });
  const helper = new ViewsListUpdate();
  await expect(
    helper.updateViewsList({
      project: "A",
      isCurrent: () => current,
      useQueryFilters: false,
    }),
  ).resolves.toEqual([]);
  expect(render).not.toHaveBeenCalled();
  expect(fire).not.toHaveBeenCalled();
});
it("emits project identity after rendering an empty project", async () => {
  fetchViews.mockResolvedValue({ views: [], states: [] });
  await new ViewsListUpdate().updateViewsList({
    project: "B",
    isCurrent: () => true,
    useQueryFilters: false,
  });
  expect(render).toHaveBeenCalledOnce();
  expect(fire).toHaveBeenCalledWith({
    type: "views_list_updated",
    data: { project: "B" },
  });
});
it("propagates a fetch failure to its owner without emitting completion", async () => {
  fetchViews.mockRejectedValue(new Error("network"));
  await expect(
    new ViewsListUpdate().updateViewsList({
      project: "B",
      useQueryFilters: false,
    }),
  ).rejects.toThrow("network");
  expect(fire).not.toHaveBeenCalled();
});
it("forwards byte progress and enters finishing before installing the list", async () => {
  const loading = { update: vi.fn(), finishing: vi.fn() };
  const sample = { loaded: 5, total: 10, lengthComputable: true };
  fetchViews.mockImplementation(async ({ onProgress }) => {
    onProgress(sample);
    return { views: [], states: [] };
  });
  render.mockImplementation(async () => {
    expect(loading.finishing).toHaveBeenCalledOnce();
  });
  await new ViewsListUpdate({ loading }).updateViewsList({
    project: "A",
    useQueryFilters: false,
  });
  expect(loading.update).toHaveBeenCalledWith(sample);
});

it("does not install an obsolete local view after waiting for the commit boundary", async () => {
  const { viewsListAddSingle } = await import("../views_list_manager");
  let current = true;
  const helper = new ViewsListUpdate({
    commit: async (work) => {
      current = false;
      return work();
    },
  });
  helper.opt = { isCurrent: () => current };
  await helper.addLocal({ id: "old" });
  expect(viewsListAddSingle).not.toHaveBeenCalled();
  expect(fire).not.toHaveBeenCalled();
});
