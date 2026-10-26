import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./../map_helpers/index.js", () => ({
  getLayersPropertiesAtBbox: vi.fn(),
}));
vi.mock("./../map_helpers/utils.js", () => ({ eventToPointBbox: vi.fn() }));
vi.mock("./../mx.js", () => ({ events: {}, theme: {}, settings: {} }));
vi.mock("./index.js", () => ({ Dashboard: class {} }));
vi.mock("../modules_loader_async/index.js", () => ({ moduleLoad: vi.fn() }));

import { Widget } from "./widget.js";

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createWidget(handlers) {
  const dashboard = {
    elDashboard: document.createElement("div"),
    widgets: [],
    isOpen: () => true,
    updatePanelLayout: vi.fn(),
    removeWidget: vi.fn(() => Promise.resolve()),
  };
  const widget = new Widget({ confWidget: { handlers }, dashboard });
  widget.build = function () {
    this.el = document.createElement("div");
  };
  widget.updateSize = vi.fn();
  widget.handleClick = vi.fn();
  widget.setUpdateDataMethod = vi.fn(() => Promise.resolve());
  return widget;
}

describe("Widget lifecycle", () => {
  let order;

  beforeEach(() => {
    order = [];
  });

  it("calls onRemove after a pending onAdd when destroyed while adding", async () => {
    const adding = deferred();
    const widget = createWidget({
      onAdd: async () => {
        await adding.promise;
        order.push("added");
      },
      onRemove: () => order.push("removed"),
    });

    const init = widget.init();
    await widget.destroy();
    expect(order).toEqual([]);

    adding.resolve();
    await init;

    expect(order).toEqual(["added", "removed"]);
    expect(widget.ready).toBeFalsy();
    expect(widget.setUpdateDataMethod).not.toHaveBeenCalled();
  });

  it("does not call onRemove when destroyed with skipOnRemove while adding", async () => {
    const adding = deferred();
    const onRemove = vi.fn();
    const widget = createWidget({ onAdd: () => adding.promise, onRemove });

    const init = widget.init();
    await widget.destroy(true);
    adding.resolve();
    await init;

    expect(onRemove).not.toHaveBeenCalled();
  });

  it("calls onRemove once when destroyed after onAdd", async () => {
    const onRemove = vi.fn();
    const widget = createWidget({ onAdd: () => {}, onRemove });

    await widget.init();
    await widget.destroy();

    expect(widget.ready).toBe(true);
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
