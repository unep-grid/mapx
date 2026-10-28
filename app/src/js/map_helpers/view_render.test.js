import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const createView = (id, type = "cc") => ({
    id,
    project: "MX-ABC-DEF-GHI-JKL-MNO",
    type,
    data:
      type === "sm"
        ? { story: { steps: [] } }
        : { methods: "", dashboard: { widgets: [{}] } },
  });
  const views = [
    createView("MX-AAAAA-BBBBB-CCCCC"),
    createView("MX-DDDDD-EEEEE-FFFFF"),
    createView("MX-GGGGG-HHHHH-IIIII"),
    createView("MX-JJJJJ-KKKKK-LLLLL", "sm"),
  ];
  const map = {
    _canvas: document.createElement("canvas"),
    getStyle: () => ({ layers: [] }),
    getLayer: () => undefined,
    getLayersOrder: () => [],
  };
  return {
    views,
    map,
    events: { fire: vi.fn() },
    isStoryPlaying: vi.fn(() => false),
    getStoryViewsId: vi.fn(() => []),
    storyClose: vi.fn(),
    dashboard: {
      createFromView: vi.fn(),
      hasViewWidgets: vi.fn(() => false),
      removeWidgetsFromView: vi.fn(() => Promise.resolve()),
    },
  };
});

vi.mock("./../mx.js", () => ({
  events: mocks.events,
  theme: {},
  maps: { map: { map: mocks.map, views: mocks.views } },
  settings: {
    map: { id: "map" },
    mode: { static: true },
    separators: { sublayer: "_" },
    layerBefore: null,
  },
}));
vi.mock("./../dashboards/index.js", () => ({ dashboard: mocks.dashboard }));
vi.mock("./view_filters.js", () => ({ viewFiltersInit: vi.fn() }));
vi.mock("./../story_map/index.js", () => ({
  isStoryPlaying: mocks.isStoryPlaying,
  getStoryViewsId: mocks.getStoryViewsId,
  storyClose: mocks.storyClose,
  storyRead: vi.fn(),
}));

import {
  getViewsActive,
  getViewsOrder,
  viewClear,
  viewRender,
} from "./index.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function firedEvents(idView) {
  return mocks.events.fire.mock.calls
    .map(([event]) => event)
    .filter((event) => event?.data?.idView === idView)
    .map((event) => event.type);
}

describe("view operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears a view once its render, dashboard included, is done", async () => {
    const [view] = mocks.views;
    const dashboardAdded = deferred();
    mocks.dashboard.createFromView.mockReturnValueOnce(dashboardAdded.promise);

    const rendering = viewRender({ view });
    await vi.waitFor(() =>
      expect(mocks.dashboard.createFromView).toHaveBeenCalledWith(view),
    );
    const clearing = viewClear({ view });
    dashboardAdded.resolve();

    expect(await rendering).toBe(true);
    expect(await clearing).toBe(true);
    expect(getViewsActive()).not.toContain(view.id);
    expect(firedEvents(view.id)).toEqual([
      "view_add",
      "view_added",
      "view_remove",
      "view_removed",
    ]);
  });

  it("starts a render of a view only once the previous one is done", async () => {
    const [, view] = mocks.views;
    const dashboardAdded = deferred();
    mocks.dashboard.createFromView
      .mockReturnValueOnce(dashboardAdded.promise)
      .mockResolvedValueOnce();

    const first = viewRender({ view });
    const second = viewRender({ idView: view.id });
    await vi.waitFor(() =>
      expect(mocks.dashboard.createFromView).toHaveBeenCalledOnce(),
    );
    expect(firedEvents(view.id)).toEqual(["view_add"]);
    dashboardAdded.resolve();

    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(mocks.dashboard.createFromView).toHaveBeenCalledTimes(2);
    expect(firedEvents(view.id)).toEqual([
      "view_add",
      "view_added",
      "view_remove",
      "view_removed",
      "view_add",
      "view_added",
    ]);
    await viewClear({ view });
  });

  it("does not keep a failed render active nor block the next operation", async () => {
    const [, , view] = mocks.views;
    mocks.dashboard.createFromView.mockRejectedValueOnce(new Error("widget"));

    await expect(viewRender({ view })).rejects.toThrow("widget");
    expect(getViewsActive()).not.toContain(view.id);

    mocks.dashboard.createFromView.mockResolvedValueOnce();
    expect(await viewRender({ view })).toBe(true);
    expect(getViewsActive()).toContain(view.id);
    await viewClear({ view });
  });

  it("lets closing a story view render it again", async () => {
    const view = mocks.views[3];
    await viewRender({ view });
    mocks.isStoryPlaying.mockReturnValueOnce(true);
    mocks.storyClose.mockImplementationOnce(() => viewRender({ view }));

    expect(await viewClear({ view })).toBe(true);
    expect(mocks.storyClose).toHaveBeenCalled();
  });

  it("does not close a story starting or closing when its view is cleared", async () => {
    const view = mocks.views[3];
    await viewRender({ view });

    expect(await viewClear({ view })).toBe(true);
    expect(mocks.storyClose).not.toHaveBeenCalled();
    expect(getViewsActive()).not.toContain(view.id);
  });
});

describe("getViewsOrder", () => {
  it("follows the current story step while a story plays", () => {
    mocks.isStoryPlaying.mockReturnValueOnce(true);
    mocks.getStoryViewsId.mockReturnValueOnce(["MX-B", "MX-A"]);

    expect(getViewsOrder()).toEqual(["MX-B", "MX-A"]);
    expect(mocks.getStoryViewsId).toHaveBeenCalledWith(true);
  });
});
