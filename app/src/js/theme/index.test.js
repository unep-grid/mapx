import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const windowMocks = vi.hoisted(() => {
  const manager = {
    el: vi.fn((tag, ...options) => {
      const element = document.createElement(tag);
      for (const option of options) {
        if (typeof option === "string") {
          element.append(option);
        }
        if (option instanceof Promise) {
          option.then((value) => element.append(String(value)));
        }
      }
      return element;
    }),
  };
  return {
    manager,
    openConfirmDialog: vi.fn(async () => true),
  };
});

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
    parseTemplate: vi.fn((template, data) =>
      template.replace("{{theme}}", data.theme),
    ),
  };
});

vi.mock("../window/index.js", () => {
  return {
    getMapxWindowManager: vi.fn(() => windowMocks.manager),
    openConfirmDialog: windowMocks.openConfirmDialog,
  };
});

vi.mock("../language", () => {
  const translations = {
    mx_theme_update_project: "Set theme as default",
    mx_theme_update_project_desc: "Set “{{theme}}” as the default theme?",
    mx_theme_delete_button: "Delete",
    mx_theme_delete_database_confirm:
      "Delete theme “{{theme}}” from the database?",
    mx_theme_delete_local_confirm:
      "Delete theme “{{theme}}” from this browser?",
    mx_theme_delete_session_confirm: "Delete session theme “{{theme}}”?",
    yes: "Yes",
    no: "No",
    btn_delete: "Delete",
    btn_cancel: "Cancel",
  };
  return {
    getLanguageCurrent: vi.fn(() => "en"),
    getDictItem: vi.fn(async (key) => translations[key] || key),
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
    constructor(options = {}) {
      FakeMapxStyle.constructorOptions.push(options);
      this.transformRequest = vi.fn();
      this.setTheme = vi.fn(() => true);
      this.setLanguage = vi.fn();
      this.attachMap = vi.fn();
      this.getStyle = vi.fn(() => ({ version: 8, layers: [], sources: {} }));
      this.enableTerrain = vi.fn();
      this.disableTerrain = vi.fn();
      this.isTerrainEnabled = vi.fn(() => false);
      this.enableTopography = vi.fn();
      this.disableTopography = vi.fn();
      this.toggleTopography = vi.fn();
      this.isTopographyEnabled = vi.fn(() => false);
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
  FakeMapxStyle.constructorOptions = [];

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
    windowMocks.openConfirmDialog.mockReset().mockResolvedValue(true);
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

  it("delegates terrain enabled state to MapxStyle", async () => {
    const { Theme, settings } = await loadThemeModule();
    settings.mode = { app: false };

    const theme = new Theme({ id: "classic_dark" });
    await theme.init();

    expect(theme.isTerrainEnabled()).toBe(false);

    theme.mapxStyle.isTerrainEnabled.mockReturnValue(true);
    expect(theme.isTerrainEnabled()).toBe(true);
  });

  it("passes a MapTiler satellite source override when a token exists", async () => {
    const { Theme, settings } = await loadThemeModule();
    const { MapxStyle } = await import("@unep-grid/mapx-style");
    MapxStyle.constructorOptions.length = 0;
    settings.mode = { app: false };
    settings.services = { maptiler: { token: "abc 123" } };

    const theme = new Theme({ id: "classic_dark" });
    await theme.init();

    const options = MapxStyle.constructorOptions.at(-1);
    expect(options.sourceOverrides.satellite).toMatchObject({
      type: "raster",
      tileSize: 256,
      maxzoom: 19,
    });
    expect(options.sourceOverrides.satellite.tiles[0]).toBe(
      "https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=abc%20123",
    );
    expect(options.sourceOverrides.satellite.attribution).toContain(
      "maptiler.com/copyright",
    );
  });

  it("keeps the default satellite source when no MapTiler token exists", async () => {
    const { Theme, settings } = await loadThemeModule();
    const { MapxStyle } = await import("@unep-grid/mapx-style");
    MapxStyle.constructorOptions.length = 0;
    settings.mode = { app: false };
    settings.services = { maptiler: { token: null } };

    const theme = new Theme({ id: "classic_dark" });
    await theme.init();

    const options = MapxStyle.constructorOptions.at(-1);
    expect(options.sourceOverrides).toBeUndefined();
  });

  it("uses translated Yes/No labels and the localized theme label for the default prompt", async () => {
    const { Theme } = await loadThemeModule();
    const theme = new Theme({ id: "classic_dark", root: document.body });

    await expect(
      theme.confirmSetAsProjectDefault({
        id: "ocean_dark",
        label: { en: "Ocean dark" },
      }),
    ).resolves.toBe(true);

    const options = windowMocks.openConfirmDialog.mock.calls.at(-1)[0];
    expect(options.title).toBe("Set theme as default");
    await vi.waitFor(() => {
      expect(options.content.textContent).toBe(
        "Set “Ocean dark” as the default theme?",
      );
    });
    await expect(options.confirmLabel).resolves.toBe("Yes");
    await expect(options.cancelLabel).resolves.toBe("No");

    windowMocks.openConfirmDialog.mockResolvedValueOnce(false);
    await expect(
      theme.confirmSetAsProjectDefault({ id: "fallback_id" }),
    ).resolves.toBe(false);
  });

  it("forwards the default-theme decision to persistence", async () => {
    const { Theme, settings } = await loadThemeModule();
    settings.project = { id: "project-1", theme: "classic_dark" };
    const theme = new Theme({ id: "classic_dark", root: document.body });
    const themeToSave = {
      id: "ocean_dark",
      label: { en: "Ocean dark" },
      colors: {},
    };
    theme.stopIfInvalidColors = vi.fn(async () => {});
    theme._s = {
      save: vi.fn(async ({ theme: savedTheme }) => ({ theme: savedTheme })),
    };
    theme.register = vi.fn(async () => {});
    theme.set = vi.fn(async () => {});
    theme.fire = vi.fn();

    windowMocks.openConfirmDialog.mockResolvedValueOnce(false);
    await theme.upsert(themeToSave);
    expect(theme._s.save).toHaveBeenLastCalledWith({
      theme: themeToSave,
      setAsProjectDefault: false,
    });
    expect(settings.project.theme).toBe("classic_dark");

    windowMocks.openConfirmDialog.mockResolvedValueOnce(true);
    await theme.upsert(themeToSave);
    expect(theme._s.save).toHaveBeenLastCalledWith({
      theme: themeToSave,
      setAsProjectDefault: true,
    });
    expect(settings.project.theme).toBe("ocean_dark");
  });

  it.each([
    ["db", "Delete theme “Ocean dark” from the database?"],
    ["local", "Delete theme “Ocean dark” from this browser?"],
    ["session", "Delete session theme “Ocean dark”?"],
  ])("uses the translated %s delete prompt", async (storage, expected) => {
    const { Theme } = await loadThemeModule();
    const theme = new Theme({ id: "classic_dark", root: document.body });

    await theme.confirmDeleteTheme(
      { id: "ocean_dark", label: { en: "Ocean dark" } },
      storage,
    );

    const options = windowMocks.openConfirmDialog.mock.calls.at(-1)[0];
    await vi.waitFor(() => {
      expect(options.content.textContent).toBe(expected);
    });
    await expect(options.confirmLabel).resolves.toBe("Delete");
    await expect(options.cancelLabel).resolves.toBe("Cancel");
  });
});
