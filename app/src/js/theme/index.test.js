import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => {
  return {
    default: {
      setRTLTextPlugin: vi.fn(),
      addProtocol: vi.fn(),
    },
  };
});

vi.mock("maplibre-contour", () => {
  return {
    default: {},
  };
});

vi.mock("./services", () => {
  class ThemeService {
    async get() {
      return { theme: null };
    }

    async list() {
      return { themes: [] };
    }

    async save() {
      return { theme: null };
    }

    async delete() {
      return {};
    }

    async validate() {
      return { issues: [] };
    }

    async validateId() {
      return { exists: false };
    }

    async getAllIds() {
      return { ids: [] };
    }

    async getSchema() {
      return { schema: {} };
    }
  }

  return { ThemeService };
});

vi.mock("./theme_modal", () => {
  return {
    ThemeModal: class ThemeModal {},
  };
});

vi.mock("../mx_helper_misc", () => {
  return {
    itemFlashCancel: vi.fn(),
    itemFlashSave: vi.fn(),
    itemFlashWarning: vi.fn(),
  };
});

vi.mock("../mx_helper_modal", () => {
  return {
    modalConfirm: vi.fn(async () => true),
  };
});

vi.mock("../language", () => {
  return {
    getLanguageCurrent: vi.fn(() => "en"),
  };
});

vi.mock("../mx.js", () => {
  return {
    events: { fire: vi.fn() },
    theme: {},
    settings: {
      project: { theme: "color_light" },
    },
  };
});

vi.mock("../mx", () => {
  return {
    events: { fire: vi.fn() },
    theme: {},
    settings: {
      project: { theme: "color_light" },
    },
  };
});

vi.mock("../init_theme.js", () => {
  return {
    theme: {},
  };
});

vi.mock("../init_theme", () => {
  return {
    theme: {},
  };
});

vi.mock("../el_mapx", async () => {
  const actual = await vi.importActual("../el_mapx");

  return {
    ...actual,
    elSelect: vi.fn(() => {
      const wrapper = document.createElement("div");
      wrapper.appendChild(document.createElement("select"));
      return wrapper;
    }),
    tt: vi.fn((key) => key),
  };
});

vi.mock("./sound/index.js", () => {
  const play = vi.fn(async () => {});
  return {
    sounds: {
      click: { play },
      switch_on: { play },
      switch_off: { play },
    },
  };
});

vi.mock("@unep-grid/mapx-style", async () => {
  const actual = await vi.importActual("@unep-grid/mapx-style");

  class FakeMapxStyle {
    constructor() {
      this.transformRequest = vi.fn();
      this.setTheme = vi.fn(() => true);
      this.setLanguage = vi.fn();
      this.attachMap = vi.fn();
      this.getStyle = vi.fn(() => ({ version: 8, layers: [], sources: {} }));
      this.enableTerrain = vi.fn();
      this.disableTerrain = vi.fn();
      this.enableSatellite = vi.fn();
      this.disableSatellite = vi.fn();
      this.toggleSatellite = vi.fn();
      this.setBoundaryType = vi.fn();
      this.getBoundaryType = vi.fn(() => "un");
      this.getImageDataUrl = vi.fn(() => null);
      this.getIconDimensions = vi.fn(async () => null);
      this.getSprites = vi.fn(async () => []);
      this.resolveSpriteName = vi.fn((id) => id);
    }
  }

  return {
    ...actual,
    MapxStyle: FakeMapxStyle,
    loadFontFamily: vi.fn(async (name) => name),
    loadThemeFonts: vi.fn(async () => []),
    listFontFamilies: vi.fn(() => [
      "Libre Baskerville",
      "Noto Sans",
      "Noto Sans Mono",
      "Roboto",
      "Titillium Web",
      "Varela Round",
    ]),
    listFonts: vi.fn(() => [
      "Noto Sans Regular",
      "Roboto Regular",
      "Varela Round Regular",
    ]),
  };
});

function createFakeButton() {
  return {
    active: false,
    activate: vi.fn(function (value) {
      this.active = !!value;
    }),
    isActive: vi.fn(function () {
      return this.active;
    }),
    toggle: vi.fn(function () {
      this.active = !this.active;
    }),
    setAction: vi.fn(function (action) {
      this.action = action;
    }),
    action: null,
  };
}

async function loadThemeModule() {
  const themeModule = await import("./index.js");
  const settingsModule = await import("../settings/index.js");
  return {
    Theme: themeModule.Theme,
    settings: settingsModule.settings,
  };
}

describe("Theme regressions", () => {
  beforeEach(() => {
    vi.resetModules();
    history.replaceState(null, "", "/");
  });

  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    history.replaceState(null, "", "/");
    vi.restoreAllMocks();
  });

  it("prefers the explicit startup theme id during init", async () => {
    const { Theme, settings } = await loadThemeModule();
    settings.mode = { app: true };
    settings.project = { id: "project-1", theme: "color_light" };

    const theme = new Theme({ id: "classic_dark" });
    theme.preloadThemes = vi.fn(async () => {});

    await theme.init();

    expect(theme.preloadThemes).toHaveBeenCalledOnce();
    expect(theme.id()).toBe("classic_dark");
    expect(new URL(location.href).searchParams.get("theme")).toBe(
      "classic_dark",
    );
  });

  it("keeps button state aligned so the first click resolves from the active theme", async () => {
    const { Theme, settings } = await loadThemeModule();
    settings.mode = { app: false };
    settings.project = { id: "project-1", theme: "color_light" };

    const theme = new Theme({ id: "classic_dark" });
    await theme.init();

    const darkButton = createFakeButton();
    const treeButton = createFakeButton();
    const waterButton = createFakeButton();

    theme.registerButton(darkButton, "dark");
    theme.registerButton(treeButton, "tree");
    theme.registerButton(waterButton, "water");

    const initialState = theme.inverseResolver(theme.id());
    expect(darkButton.active).toBe(initialState.dark);
    expect(treeButton.active).toBe(initialState.tree);
    expect(waterButton.active).toBe(initialState.water);

    const expectedTheme = theme.resolver({
      ...initialState,
      tree: !initialState.tree,
    });

    await treeButton.action();

    expect(theme.id()).toBe(expectedTheme.id);
    expect(treeButton.active).toBe(!initialState.tree);
  });

  it("delegates sprite catalog loading to MapxStyle", async () => {
    const { Theme, settings } = await loadThemeModule();
    settings.mode = { app: false };

    const theme = new Theme({ id: "classic_dark" });
    await theme.init();

    await expect(theme.getSprites({ groups: ["maki"] })).resolves.toEqual([]);
    expect(theme.mapxStyle.getSprites).toHaveBeenCalledWith({
      groups: ["maki"],
    });
  });

  it("delegates boundary type changes to MapxStyle", async () => {
    const { Theme, settings } = await loadThemeModule();
    settings.mode = { app: false };

    const theme = new Theme({ id: "classic_dark" });
    await theme.init();

    theme.setBoundaryType("wmo");

    expect(theme.mapxStyle.setBoundaryType).toHaveBeenCalledWith("wmo");
    expect(theme.getBoundaryType()).toBe("un");
  });
});
