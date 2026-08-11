import { beforeEach, describe, expect, it, vi } from "vitest";
import services from "../settings/wms.json";

const tomSelectMock = vi.hoisted(() => ({
  instances: [],
  load: vi.fn(),
}));

vi.mock("../modules_loader_async", () => ({
  moduleLoad: tomSelectMock.load,
}));

vi.mock("./index.js", () => ({
  wmsGetLayers: vi.fn(),
  urlTile: vi.fn(),
  urlLegend: vi.fn(),
}));

vi.mock("../mx_helper_misc.js", () => ({
  setBusy: vi.fn(),
}));

vi.mock("../mx_helper_modal.js", () => ({
  modal: vi.fn(),
}));

vi.mock("../error_handler/index.js", () => ({
  errorFormater: vi.fn((error) => error),
}));

vi.mock("../el_mapx/index.js", async () => {
  const { el } = await vi.importActual("../el/src/index.js");
  return {
    el,
    elSpanTranslate: (id) => document.createTextNode(id),
  };
});

import { wmsBuildQueryUi } from "./ui.js";

class TomSelectStub {
  constructor(element, config) {
    this.element = element;
    this.config = config;
    this.value = "";
    tomSelectMock.instances.push(this);
  }

  destroy() {}

  disable() {}

  enable() {}

  getValue() {
    return this.value;
  }

  refreshOptions() {}

  setValue(value) {
    this.value = value;
    this.config.onChange?.(value);
  }
}

function createFixture() {
  document.body.innerHTML = `
    <div id="wms-generator"></div>
    <input id="tile-url">
    <input id="legend-url">
    <input id="use-mirror" type="checkbox">
    <select id="tile-size"><option value="512">512</option></select>
  `;

  return {
    selectorParent: "#wms-generator",
    selectorTileInput: "#tile-url",
    selectorLegendInput: "#legend-url",
    selectorUseMirror: "#use-mirror",
    selectorTileSizeInput: "#tile-size",
  };
}

function configuredServiceOptions() {
  return tomSelectMock.instances.find(
    ({ config }) => config.options.length > 0,
  )?.config.options;
}

describe("wmsBuildQueryUi", () => {
  beforeEach(() => {
    tomSelectMock.instances.length = 0;
    tomSelectMock.load.mockResolvedValue(TomSelectStub);
    document.body.innerHTML = "";
  });

  it("uses frontend settings when services are omitted", async () => {
    await wmsBuildQueryUi(createFixture());

    expect(configuredServiceOptions()).toEqual(
      services.map(({ label, value }) => ({ text: label, value })),
    );
    expect(document.querySelector("#wms-generator input").value).toBe(
      services[0].value,
    );
  });

  it("supports an explicitly supplied service list", async () => {
    const customServices = [
      { label: "Custom WMS", value: "https://example.com/wms" },
    ];

    await wmsBuildQueryUi({
      ...createFixture(),
      services: customServices,
    });

    expect(configuredServiceOptions()).toEqual([
      { text: "Custom WMS", value: "https://example.com/wms" },
    ]);
  });

  it("sanitizes layer abstracts when rendering fetched options", async () => {
    await wmsBuildQueryUi(createFixture());
    const layerSelect = tomSelectMock.instances.find(
      ({ config }) => config.render?.option,
    );

    const output = layerSelect.config.render.option(
      {
        name: "test:layer",
        title: "Test layer",
        abstract: '<img src="x" onerror="alert(1)">',
      },
      (value) => value,
    );

    expect(output).toContain(
      '<li class="text-muted small mx-text-truncate-2-lines"><img src="x"></li>',
    );
  });
});
