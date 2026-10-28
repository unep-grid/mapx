import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const idStory = "MX-STORY-STORY-STORY";
  const idView = "MX-VIEWA-VIEWA-VIEWA";
  const storyView = {
    id: idStory,
    project: "MX-ABC-DEF-GHI-JKL-MNO",
    type: "sm",
    data: {
      story: {
        steps: [
          {
            name: "Step 1",
            views: [idView],
            position: { z: 1, lat: 0, lng: 0 },
            slides: [{ html: "<p>Slide</p>", classes: [], effects: [] }],
          },
        ],
      },
    },
  };

  const listenerStore = [];
  const listeners = {
    addListener: (opt) => {
      const types = Array.isArray(opt.type) ? opt.type : [opt.type];
      for (const type of types) {
        opt.target.addEventListener(type, opt.callback);
      }
      listenerStore.push({ ...opt, types });
    },
    removeListenerByGroup: (group) => {
      for (const item of [...listenerStore]) {
        if (item.group !== group) {
          continue;
        }
        for (const type of item.types) {
          item.target.removeEventListener(type, item.callback);
        }
        listenerStore.splice(listenerStore.indexOf(item), 1);
        item.onRemove?.();
      }
    },
  };

  const createControl = () => {
    const elButton = document.createElement("button");
    elButton.innerHTML = '<i class="fa fa-lock"></i>';
    return {
      elButton,
      action: vi.fn(),
      isActive: () => false,
      show: vi.fn(),
      hide: vi.fn(),
    };
  };

  return {
    idStory,
    idView,
    storyView,
    listeners,
    controls: new Map(),
    createControl,
    viewsActive: new Set(),
    map: null,
    initEditing: vi.fn(),
    errorHandler: vi.fn(),
    viewRender: vi.fn(),
    viewClear: vi.fn(),
  };
});

vi.mock("./../mx", () => ({
  theme: { id: () => "light", set: vi.fn() },
  panels: { batch: vi.fn(), hide: vi.fn(), show: vi.fn() },
  events: { on: vi.fn(), off: vi.fn(), offGroup: vi.fn(), fire: vi.fn() },
  controls: {
    get: (key) => {
      if (!mocks.controls.has(key)) {
        mocks.controls.set(key, mocks.createControl());
      }
      return mocks.controls.get(key);
    },
    sizeOptimizer: vi.fn(),
  },
  listeners: mocks.listeners,
}));
vi.mock("./../settings", () => ({
  settings: { mode: { static: false }, layerBefore: null },
}));
vi.mock("./../language", () => ({
  getLabelFromObjectPath: ({ obj, path }) => obj[path],
}));
vi.mock("./../error_handler/index.js", () => ({
  errorHandler: mocks.errorHandler,
}));
vi.mock("./../mx_helper_modal.js", () => ({ modal: vi.fn() }));
vi.mock("../panel_legend/index.js", () => ({
  ButtonPanelLegend: class {
    constructor() {
      this.elPanelContent = document.createElement("div");
    }
    getContainer() {
      return this.elPanelContent;
    }
    destroy() {}
    resizeAuto() {}
    open() {}
    close() {}
  },
}));
vi.mock("./../animation_frame/index.js", () => ({
  onNextFrame: vi.fn(),
  cancelFrame: vi.fn(),
  // The render loop waits forever : steps are played explicitly
  waitFrameAsync: () => new Promise(() => {}),
  waitTimeoutAsync: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}));
vi.mock("./../icon_flash/index.js", () => ({ FlashItem: class {} }));
vi.mock("./../mx_helper_misc.js", () => ({
  path: (obj, p, def) =>
    p.split(".").reduce((o, k) => o?.[k], obj) ?? def ?? null,
  easingFun: () => (t) => t,
  scrollFromTo: vi.fn(() => Promise.resolve()),
  cancelScrollFromTo: vi.fn(),
  cssTransform: "transform",
  debounce: (fun) => fun,
  isFirefox: () => true,
}));
vi.mock("./../dashboards/index.js", () => ({
  dashboard: {
    remove: vi.fn(),
    hasViewWidgets: () => false,
    addWidgetsToView: vi.fn(),
    exec: vi.fn(),
    getConfigFromView: vi.fn(),
    autoDestroy: vi.fn(),
  },
}));
vi.mock("./../mx_helper_canvas.js", () => ({ createCanvas: vi.fn() }));
vi.mock("./../map_helpers/index.js", () => ({
  getMapPos: () => ({ z: 2, b: 0, p: 0, lng: 0, lat: 0 }),
  viewAdd: vi.fn(() => Promise.resolve(true)),
  viewRemove: vi.fn(() => Promise.resolve(true)),
  viewClear: mocks.viewClear,
  viewRender: mocks.viewRender,
  viewsLayersOrderUpdate: vi.fn(),
  getMap: () => mocks.map,
  setMapProjection: vi.fn(),
  getViewAuto: (view) => view,
  getViewsActive: () => Array.from(mocks.viewsActive),
}));
vi.mock("../map_helpers/utils", () => ({
  normalizeDestinationPos: (pos) => pos,
}));
vi.mock("./editor.js", () => ({ initEditing: mocks.initEditing }));

import {
  storyRead,
  storyClose,
  storyPlayStep,
  isStoryPlaying,
} from "./index.js";
import {
  setMapProjection,
  viewAdd,
  viewsLayersOrderUpdate,
} from "./../map_helpers/index.js";
import { theme } from "./../mx";

function createMap() {
  const elContainer = document.createElement("div");
  const elControls = document.createElement("div");
  elControls.className = "maplibregl-control-container";
  elContainer.appendChild(elControls);
  document.body.appendChild(elContainer);
  return {
    elContainer,
    getContainer: () => elContainer,
    keyboard: {
      isEnabled: () => true,
      enable: vi.fn(),
      disable: vi.fn(),
    },
    stop: vi.fn(),
    isStyleLoaded: vi.fn(() => true),
    // Continuous source updates : never idle
    once: vi.fn(() => new Promise(() => {})),
    getMaxBounds: () => null,
    setMaxBounds: vi.fn(),
    getProjection: () => ({ name: "mercator" }),
    resize: vi.fn(),
    jumpTo: vi.fn(),
    easeTo: vi.fn(),
    fitBounds: vi.fn(),
  };
}

function getStoryUi() {
  return mocks.map.elContainer.querySelector(".mx-story-layout");
}

function getState() {
  return window._sm.state;
}

async function settle(ms = 30000) {
  await vi.advanceTimersByTimeAsync(ms);
}

describe("story map lifecycle", () => {
  let elBtnPreview;

  beforeEach(() => {
    vi.useFakeTimers();
    mocks.map = createMap();
    // Story editor, a legacy R modal
    elBtnPreview = document.createElement("button");
    elBtnPreview.id = "btnViewPreviewStory";
    document.body.appendChild(elBtnPreview);
    mocks.viewsActive.clear();
    mocks.initEditing.mockReset();
    mocks.initEditing.mockResolvedValue(undefined);
    mocks.errorHandler.mockReset();
    mocks.viewRender.mockReset();
    mocks.viewRender.mockResolvedValue(true);
    mocks.viewClear.mockReset();
    mocks.viewClear.mockResolvedValue(true);
    viewAdd.mockReset();
    viewAdd.mockResolvedValue(true);
    setMapProjection.mockReset();
  });

  afterEach(async () => {
    const closing = storyClose();
    await settle();
    await closing;
    mocks.map.elContainer.remove();
    elBtnPreview.remove();
    vi.useRealTimers();
  });

  it("removes the story at once when the map never gets idle", async () => {
    await storyRead({ view: mocks.storyView });
    expect(isStoryPlaying()).toBe(true);
    expect(getStoryUi()).not.toBeNull();

    mocks.map.isStyleLoaded.mockReturnValue(false);
    const closing = storyClose();

    expect(getStoryUi()).toBeNull();
    await settle();
    await closing;
    expect(isStoryPlaying()).toBe(false);
    expect(getState()).toEqual({});
  });

  it("closes while a step waits for a view that never renders", async () => {
    await storyRead({ view: mocks.storyView });
    mocks.viewRender.mockReturnValue(new Promise(() => {}));
    storyPlayStep(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.viewRender).toHaveBeenCalled();

    const closing = storyClose();
    expect(getStoryUi()).toBeNull();
    await settle();
    await closing;

    expect(getState()).toEqual({});
    // The story view is cleared too : a late render is removed after it
    expect(mocks.viewClear).toHaveBeenCalledWith(
      expect.objectContaining({ idView: mocks.idView }),
    );
  });

  it("shares one close between concurrent calls", async () => {
    await storyRead({ view: mocks.storyView });
    const first = storyClose();
    const second = storyClose();
    expect(second).toBe(first);
    await settle();
    await first;
  });

  it("closes even if the editor removal fails", async () => {
    mocks.initEditing.mockImplementation(async (state) => {
      state.ct_editor_remove = () => {
        throw new Error("editor already removed");
      };
    });
    await storyRead({ view: mocks.storyView, edit: true, update: true });
    expect(isStoryPlaying()).toBe(true);

    const closing = storyClose();
    await settle();
    await closing;

    expect(getStoryUi()).toBeNull();
    expect(getState()).toEqual({});
  });

  it("cancels a preview closed while it starts", async () => {
    let resolveEditing;
    mocks.initEditing.mockReturnValue(
      new Promise((resolve) => {
        resolveEditing = resolve;
      }),
    );
    const reading = storyRead({
      view: mocks.storyView,
      edit: true,
      update: true,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(getStoryUi()).not.toBeNull();
    expect(isStoryPlaying()).toBe(false);

    const closing = storyClose();
    expect(getStoryUi()).toBeNull();
    resolveEditing();
    await settle();
    await Promise.all([reading, closing]);

    expect(isStoryPlaying()).toBe(false);
    expect(getStoryUi()).toBeNull();
    expect(getState()).toEqual({});
  });

  it("removes a story whose start failed after its build", async () => {
    mocks.initEditing.mockRejectedValue(new Error("chunk load failed"));
    const reading = storyRead({
      view: mocks.storyView,
      edit: true,
      update: true,
    });
    await settle();
    await reading;

    expect(mocks.errorHandler).toHaveBeenCalled();
    expect(getStoryUi()).toBeNull();
    expect(isStoryPlaying()).toBe(false);
    expect(getState()).toEqual({});
  });

  it("does not inherit the preview mode in the next read", async () => {
    await storyRead({ view: mocks.storyView, edit: true, update: true });
    const closing = storyClose();
    await settle();
    await closing;

    await storyRead({ idView: mocks.idStory, view: mocks.storyView });
    const state = getState();
    expect(state.edit).toBe(false);
    expect(state.update).toBe(false);
    expect(state.elStoryNav.refs.quit.hidden).toBe(false);
  });

  it("cancels a read waiting for a close when a new close is requested", async () => {
    await storyRead({ view: mocks.storyView });
    const firstClose = storyClose();
    const reading = storyRead({
      view: mocks.storyView,
      edit: true,
      update: true,
    });
    const secondClose = storyClose();
    expect(secondClose).toBe(firstClose);

    await settle();
    await Promise.all([firstClose, reading]);

    expect(mocks.initEditing).not.toHaveBeenCalled();
    expect(isStoryPlaying()).toBe(false);
    expect(getStoryUi()).toBeNull();
    expect(getState()).toEqual({});
  });

  it("removes the story on screen when its re-read is not a story", async () => {
    mocks.viewsActive.add("MX-USERV-USERV-USERV");
    await storyRead({ view: mocks.storyView, edit: true, update: true });
    expect(getStoryUi()).not.toBeNull();

    const reading = storyRead({
      view: { ...mocks.storyView, data: { story: { steps: [] } } },
      edit: true,
      update: true,
    });
    await settle();
    await reading;

    expect(mocks.errorHandler).toHaveBeenCalled();
    expect(getStoryUi()).toBeNull();
    expect(getState()).toEqual({});
    expect(viewAdd).toHaveBeenCalledWith("MX-USERV-USERV-USERV");
  });

  it("restores the app state only once the read step in progress is done", async () => {
    let resolveEditing;
    mocks.initEditing.mockReturnValue(
      new Promise((resolve) => {
        resolveEditing = resolve;
      }),
    );
    const reading = storyRead({
      view: mocks.storyView,
      edit: true,
      update: true,
    });
    await vi.advanceTimersByTimeAsync(0);

    const closing = storyClose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(setMapProjection).not.toHaveBeenCalled();

    resolveEditing();
    await settle();
    await Promise.all([reading, closing]);
    expect(setMapProjection).toHaveBeenCalled();
    expect(getState()).toEqual({});
  });

  it("clears every view before restoring any, even if a clear never ends", async () => {
    const idUserView = "MX-USERV-USERV-USERV";
    // Story view last : a sequential clear would reach it after the restore
    mocks.viewsActive.add(idUserView);
    mocks.viewsActive.add(mocks.idView);
    await storyRead({ view: mocks.storyView });

    mocks.viewClear.mockImplementation(({ idView }) =>
      idView === idUserView ? new Promise(() => {}) : Promise.resolve(true),
    );
    const closing = storyClose();
    await settle();
    await closing;

    const clearOrder = mocks.viewClear.mock.calls.findIndex(
      ([opt]) => opt.idView === mocks.idView,
    );
    const addOrder = viewAdd.mock.calls.findIndex(
      ([id]) => id === mocks.idView,
    );
    expect(addOrder).toBeGreaterThanOrEqual(0);
    expect(mocks.viewClear.mock.invocationCallOrder[clearOrder]).toBeLessThan(
      viewAdd.mock.invocationCallOrder[addOrder],
    );
  });

  it("restores every view, stalled or not, before the close ends", async () => {
    const idViews = [
      "MX-A1AAA-AAAAA-AAAAA",
      "MX-B1BBB-BBBBB-BBBBB",
      "MX-C1CCC-CCCCC-CCCCC",
    ];
    for (const id of idViews) {
      mocks.viewsActive.add(id);
    }
    await storyRead({ view: mocks.storyView });

    mocks.map.isStyleLoaded.mockReturnValue(false);
    mocks.viewClear.mockReturnValue(new Promise(() => {}));
    viewAdd.mockReturnValue(new Promise(() => {}));
    let closed = false;
    storyClose().then(() => {
      closed = true;
    });

    // 100 ms, one bound for idle and operations, one for clears, one per view
    await vi.advanceTimersByTimeAsync(100 + 2 * 3000 + 2 * 3000);
    expect(closed).toBe(false);
    await vi.advanceTimersByTimeAsync(3000 + 50);
    expect(closed).toBe(true);
    expect(getState()).toEqual({});
    expect(viewAdd.mock.calls.map(([id]) => id)).toEqual(idViews);

    // Nothing starts once the close is done
    await settle();
    expect(viewAdd).toHaveBeenCalledTimes(idViews.length);
  });

  it("starts a newer read once the step of the read it supersedes is done", async () => {
    let resolveEditing;
    mocks.initEditing.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveEditing = resolve;
      }),
    );
    const previewing = storyRead({
      view: mocks.storyView,
      edit: true,
      update: true,
    });
    await vi.advanceTimersByTimeAsync(0);

    const reading = storyRead({ view: mocks.storyView });
    await vi.advanceTimersByTimeAsync(1000);
    // The newer read has not reset the options of the preview yet
    expect(getState().edit).toBe(true);

    resolveEditing();
    await vi.advanceTimersByTimeAsync(0);
    await Promise.all([previewing, reading]);

    expect(mocks.initEditing).toHaveBeenCalledOnce();
    expect(isStoryPlaying()).toBe(true);
    expect(getState().edit).toBe(false);
  });

  it("ignores a preview whose editor was closed meanwhile", async () => {
    elBtnPreview.remove();
    await storyRead({ view: mocks.storyView, edit: true, update: true });

    expect(getStoryUi()).toBeNull();
    expect(isStoryPlaying()).toBe(false);
    expect(getState()).toEqual({});
  });
  it("keeps an operation of a closed story out of the next story", async () => {
    let resolveRender;
    await storyRead({ view: mocks.storyView });
    mocks.viewRender.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRender = resolve;
      }),
    );
    storyPlayStep(0);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.viewRender).toHaveBeenCalled();

    // The close stops waiting for the render : the operation outlives it
    const closing = storyClose();
    await settle();
    await closing;
    await storyRead({ view: mocks.storyView });
    expect(isStoryPlaying()).toBe(true);

    viewsLayersOrderUpdate.mockClear();
    resolveRender(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(viewsLayersOrderUpdate).not.toHaveBeenCalled();
  });

  it("restores the theme when closed during a remote theme fetch", async () => {
    const storyThemed = structuredClone(mocks.storyView);
    storyThemed.data.story.settings = { theme: "remote-theme" };
    let resolveTheme;
    theme.set.mockReset();
    theme.set.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveTheme = resolve;
      }),
    );
    const reading = storyRead({ view: storyThemed });
    await vi.advanceTimersByTimeAsync(0);
    expect(theme.set).toHaveBeenLastCalledWith(
      "remote-theme",
      expect.anything(),
    );

    // The fetch outlives the close : theme.set skips its restore
    const closing = storyClose();
    await settle();
    await closing;
    theme.set.mockClear();
    resolveTheme();
    await reading;
    await vi.advanceTimersByTimeAsync(0);

    expect(theme.set).toHaveBeenCalledOnce();
    expect(theme.set).toHaveBeenCalledWith(
      "light",
      expect.objectContaining({ save_url: true }),
    );
  });
});
