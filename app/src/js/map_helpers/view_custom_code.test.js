import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resetLayer: vi.fn(),
  addListener: vi.fn(),
  removeListenerByGroup: vi.fn(),
}));

vi.mock("../el_mapx/index.js", () => ({
  el: (tag, content) => {
    const node = document.createElement(tag);
    if (content) {
      node.innerHTML = content;
    }
    return node;
  },
}));

vi.mock("../mx_helper_misc.js", () => ({
  path: (obj, path) => path.split(".").reduce((out, key) => out?.[key], obj),
}));

let CustomCodeView;

beforeEach(async () => {
  vi.clearAllMocks();
  ({ CustomCodeView } = await import("./view_custom_code.js"));
});

function createMap() {
  const state = {
    sources: {},
    layers: [],
  };

  return {
    state,
    getStyle: vi.fn(() => ({
      layers: state.layers,
    })),
    getSource: vi.fn((id) => state.sources[id]),
    addSource: vi.fn((id, source) => {
      state.sources[id] = source;
    }),
    removeSource: vi.fn((id) => {
      delete state.sources[id];
    }),
    getLayer: vi.fn((id) => state.layers.find((layer) => layer.id === id)),
    addLayer: vi.fn((layer) => {
      state.layers.push(layer);
    }),
    removeLayer: vi.fn((id) => {
      state.layers = state.layers.filter((layer) => layer.id !== id);
    }),
  };
}

function createView(methods) {
  return {
    id: "MX-CC-TEST",
    data: {
      methods,
    },
  };
}

function createRuntime(methods) {
  const elLegend = document.createElement("div");
  elLegend.id = "view_legend_MX-CC-TEST";

  return new CustomCodeView({
    view: createView(methods),
    map: createMap(),
    buildLegend: () => elLegend,
    highlighter: {
      resetLayer: mocks.resetLayer,
    },
    listeners: {
      addListener: mocks.addListener,
      removeListenerByGroup: mocks.removeListenerByGroup,
    },
    layerBefore: "mxlayers",
  });
}

describe("CustomCodeView", () => {
  it("parses wrapped handler functions", async () => {
    const customCodeView = createRuntime(`
      function handler() {
        return {
          onInit: async function(cc) {
            cc.setLegend("<span>ready</span>");
          },
          onClose: async function() {}
        };
      }
    `);

    await expect(customCodeView.init()).resolves.toBe(true);
    expect(customCodeView.elLegend.textContent).toBe("ready");
  });

  it("parses bare handler bodies", async () => {
    const customCodeView = createRuntime(`
      return {
        onInit: async function(cc) {
          cc.addSource({ type: "geojson", data: { type: "FeatureCollection", features: [] } });
        },
        onClose: async function() {}
      };
    `);

    await expect(customCodeView.init()).resolves.toBe(true);
    expect(customCodeView.map.addSource).toHaveBeenCalledWith(
      "MX-CC-TEST-SRC",
      {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      },
    );
  });

  it("rejects invalid handlers", async () => {
    const customCodeView = createRuntime(`
      return {
        onInit: async function() {}
      };
    `);

    await expect(customCodeView.init()).resolves.toBe(false);
  });

  it("runs close and clears custom map state", async () => {
    const onClose = vi.fn();
    window.__customCodeOnClose = onClose;
    const customCodeView = createRuntime(`
      return {
        onInit: async function(cc) {
          cc.addSource({ type: "geojson", data: { type: "FeatureCollection", features: [] } });
          cc.addLayer({ id: cc.idView, type: "circle", source: cc.idSource });
          cc.map.addLayer({ id: cc.idView + "-extra", type: "circle", source: cc.idSource });
        },
        onClose: async function() {
          window.__customCodeOnClose();
        }
      };
    `);

    await customCodeView.init();
    await customCodeView.close();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.removeListenerByGroup).toHaveBeenCalledWith(
      "listener_cc_MX-CC-TEST",
    );
    expect(mocks.resetLayer).toHaveBeenCalledWith("MX-CC-TEST");
    expect(customCodeView.map.removeLayer).toHaveBeenCalledWith("MX-CC-TEST");
    expect(customCodeView.map.removeLayer).toHaveBeenCalledWith(
      "MX-CC-TEST-extra",
    );
    expect(customCodeView.map.removeSource).toHaveBeenCalledWith(
      "MX-CC-TEST-SRC",
    );

    delete window.__customCodeOnClose;
  });
});
