import { describe, expect, it, vi } from "vitest";

const loading = vi.hoisted(() => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
});

vi.mock("./widget.js", () => ({ Widget: class {} }));
vi.mock("./../button_panel", () => ({ ButtonPanel: class {} }));
vi.mock("./../modules_loader_async", () => ({
  modulesLoad: vi.fn(() => loading.promise),
}));
vi.mock("./../mx.js", () => ({ events: {}, theme: {}, settings: {} }));
vi.mock("./style.less", () => ({}));

import { Dashboard } from "./dashboard.js";

describe("Dashboard", () => {
  it("adds no widget once destroyed while loading modules", async () => {
    const dashboard = Object.create(Dashboard.prototype);
    Object.assign(dashboard, {
      opt: { dashboard: { modules: [] } },
      modules: {},
      _attributions: [],
      _destroyed: false,
      addWidget: vi.fn(),
      fire: vi.fn(),
    });

    const added = dashboard.addWidgets({ widgets: [{}], modules: [] });
    dashboard._destroyed = true;
    loading.resolve([]);

    expect(await added).toEqual([]);
    expect(dashboard.addWidget).not.toHaveBeenCalled();
  });
});
