import { describe, expect, it, vi } from "vitest";

const views = vi.hoisted(() => new Map());

vi.mock("./../map_helpers", () => ({
  getView: (idView) => views.get(idView?.id ?? idView),
  getMap: vi.fn(),
}));
vi.mock("../story_map", () => ({
  storyMapShakeLock: vi.fn(),
  isStoryPlaying: vi.fn(() => false),
}));
vi.mock("../language", () => ({ getDictItem: vi.fn() }));
vi.mock("./../mx.js", () => ({ events: {}, theme: {}, settings: {} }));
vi.mock("./dashboard.js", () => ({ Dashboard: class {} }));

import { DashboardManager } from "./manager.js";

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("DashboardManager", () => {
  it("removes widgets whose view was cleared while they were added", async () => {
    const view = {
      id: "MX-AAAAA-BBBBB-CCCCC",
      project: "MX-ABC-DEF-GHI-JKL-MNO",
      type: "cc",
      data: { dashboard: { widgets: [{}] } },
    };
    views.set(view.id, view);
    const widget = { destroy: vi.fn(() => Promise.resolve()) };
    const adding = deferred();
    const dm = new DashboardManager();
    dm.getOrCreate = vi.fn(() =>
      Promise.resolve({
        addWidgets: () => adding.promise,
        isDestroyed: () => false,
      }),
    );
    dm.autoDestroy = vi.fn();

    const added = dm.addWidgetsToView(view.id);
    await dm.removeWidgetsFromView(view.id);
    adding.resolve([widget]);

    expect(await added).toEqual([]);
    expect(widget.destroy).toHaveBeenCalledOnce();
    expect(view._widgets).toBeUndefined();
  });

  it("removes widgets added to a dashboard destroyed meanwhile", async () => {
    const view = {
      id: "MX-DDDDD-EEEEE-FFFFF",
      project: "MX-ABC-DEF-GHI-JKL-MNO",
      type: "cc",
      data: { dashboard: { widgets: [{}] } },
    };
    views.set(view.id, view);
    const widget = { destroy: vi.fn(() => Promise.resolve()) };
    const dm = new DashboardManager();
    dm.getOrCreate = vi.fn(() =>
      Promise.resolve({
        addWidgets: () => Promise.resolve([widget]),
        isDestroyed: () => true,
      }),
    );

    expect(await dm.addWidgetsToView(view.id)).toEqual([]);
    expect(widget.destroy).toHaveBeenCalledOnce();
    expect(view._widgets).toBeUndefined();
  });

  it("ignores destroyed widgets a view still references", () => {
    const view = {
      id: "MX-GGGGG-HHHHH-IIIII",
      project: "MX-ABC-DEF-GHI-JKL-MNO",
      type: "cc",
      data: { dashboard: { widgets: [{}] } },
      _widgets: [{ destroyed: true }],
    };
    views.set(view.id, view);
    const dm = new DashboardManager();

    expect(dm.hasViewWidgets(view.id)).toBe(false);
    view._widgets.push({ destroyed: false });
    expect(dm.hasViewWidgets(view.id)).toBe(true);
  });
});
