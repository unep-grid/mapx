import { beforeEach, describe, expect, it, vi } from "vitest";

const themeMock = vi.hoisted(() => ({
  enableTerrain: vi.fn(),
  disableTerrain: vi.fn(),
  registerButton: vi.fn(),
}));

vi.mock("./button.js", () => {
  class Button {
    constructor(opt) {
      this.opt = opt;
      this.elButton = document.createElement("button");
      this.elIcon = document.createElement("i");
      const action = typeof opt.action === "function" ? opt.action : () => {};
      this.action = action.bind(this);
      this.enable = vi.fn(() => this.elButton.classList.add("active"));
      this.disable = vi.fn(() => this.elButton.classList.remove("active"));
      this.isActive = vi.fn(() => this.elButton.classList.contains("active"));
      if (opt.onInit) opt.onInit(this);
    }
  }

  return { Button };
});

vi.mock("screenfull", () => ({ default: { request: vi.fn(), exit: vi.fn() } }));
vi.mock("./../map_composer", () => ({ mapComposerModalAuto: vi.fn() }));
vi.mock("./../map_helpers/index.js", () => ({
  getMap: vi.fn(),
  getLayerNamesByPrefix: vi.fn(() => []),
  setMapProjection: vi.fn(),
}));
vi.mock("./../share_modal/index.js", () => ({ ShareModal: vi.fn() }));
vi.mock("./../story_map/index.js", () => ({
  storyMapLock: vi.fn(),
  storyClose: vi.fn(),
}));
vi.mock("./../settings", () => ({ settings: { links: { repository: "" } } }));
vi.mock("./../mx.js", () => ({ theme: themeMock, draw: { toggle: vi.fn() } }));
vi.mock("../issue_reporter/index.js", () => ({ IssueReporterClient: vi.fn() }));
vi.mock("../modal_iframe/index.js", () => ({ modalIframe: vi.fn() }));
vi.mock("../geocoder/modal.js", () => ({ GeocoderModal: vi.fn() }));

import { generateButtons } from "./mapx_buttons.js";

function getTerrainButton() {
  return generateButtons().find((button) => button.opt.key === "btn_3d_terrain");
}

describe("btn_3d_terrain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles terrain on click-like actions", () => {
    const button = getTerrainButton();

    expect(button.action()).toBe(true);
    expect(button.elButton.classList.contains("active")).toBe(true);
    expect(themeMock.enableTerrain).toHaveBeenCalledTimes(1);

    expect(button.action()).toBe(false);
    expect(button.elButton.classList.contains("active")).toBe(false);
    expect(themeMock.disableTerrain).toHaveBeenCalledTimes(1);
  });

  it("treats enable and disable as idempotent commands", () => {
    const button = getTerrainButton();

    expect(button.action("enable")).toBe(true);
    expect(button.action("enable")).toBe(true);
    expect(button.elButton.classList.contains("active")).toBe(true);
    expect(themeMock.enableTerrain).toHaveBeenCalledTimes(2);
    expect(themeMock.disableTerrain).not.toHaveBeenCalled();

    expect(button.action("disable")).toBe(false);
    expect(button.action("disable")).toBe(false);
    expect(button.elButton.classList.contains("active")).toBe(false);
    expect(themeMock.disableTerrain).toHaveBeenCalledTimes(2);
  });

  it("keeps show and hide aliases for story map callers", () => {
    const button = getTerrainButton();

    expect(button.action("show")).toBe(true);
    expect(button.elButton.classList.contains("active")).toBe(true);

    expect(button.action("hide")).toBe(false);
    expect(button.elButton.classList.contains("active")).toBe(false);
  });
});
