import "./style.less";
import "./navigation/index.js";
import { getStepPreviewData } from "./navigation/preview.js";
import { getLabelFromObjectPath } from "./../language";
import { ElementCreator, el } from "./../el/src/index.js";
import { errorHandler } from "./../error_handler/index.js";
import { modal } from "./../mx_helper_modal.js";
import { settings as settingsMapx } from "./../settings";
import { settings as storySettings } from "./settings.js";
import { theme, panels, events, controls, listeners } from "./../mx";
import { ButtonPanelLegend } from "../panel_legend/index.js";
import {
  onNextFrame,
  cancelFrame,
  waitFrameAsync,
  waitTimeoutAsync,
} from "./../animation_frame/index.js";
import { FlashItem } from "./../icon_flash/index.js";
import {
  path,
  easingFun,
  scrollFromTo,
  cancelScrollFromTo,
  cssTransform,
  debounce,
  isFirefox,
} from "./../mx_helper_misc.js";
import { dashboard } from "./../dashboards/index.js";
import { getArrayDiff } from "./../array_stat/index.js";
import { createCanvas } from "./../mx_helper_canvas.js";
import {
  isJson,
  isArray,
  isStory,
  isViewId,
  isNumeric,
  isEmpty,
  isNotEmpty,
  isView,
  isBoolean,
  isPromise,
} from "./../is_test/index.js";
import {
  getMapPos,
  viewAdd,
  viewRemove,
  viewClear,
  viewRender,
  viewsLayersOrderUpdate,
  getMap,
  setMapProjection,
  getViewAuto,
  getViewsActive,
} from "./../map_helpers/index.js";
import { normalizeDestinationPos } from "../map_helpers/utils";

/**
 * Story and state storage
 */
const story = {};
const state = {};
window._sm = { story, state };

/**
 * Lifecycle
 * - Each read and each close starts a new generation : a read whose
 *   generation is outdated stops at its next step.
 * - A close is shared by concurrent callers and bounds its waits : views
 *   and widgets run user code that may never settle.
 * - A close waits for the read steps in progress : a step that finishes
 *   after the restore would overwrite it.
 */
const closeWaitMax = 3000;
let storyGeneration = 0;
let storyClosing = null;
const readStepsPending = new Set();

const readSteps = [
  initStory,
  initSettings,
  initControls,
  initLegendPanel,
  build,
  initState,
  initTheme,
  initProjection,
  initListeners,
  handleMissingImages,
  initAdaptiveLayout,
];

/**
 * Read and evaluate story map
 * @param {Object} opt options
 * @param {String} opt.idView View id. If no view is given, fetch one by id
 * @param {Object} opt.view A view object containing a story
 * @param {Boolean} opt.edit Enable editing
 * @param {Boolean} opt.close Close
 * @param {Boolean} opt.update Update : partial cleaning
 * @param {Boolean} opt.storyAutoStart Bypass everything, start story, don't display back button
 */
export async function storyRead(opt) {
  if (opt.close) {
    await storyClose();
    return true;
  }
  if (opt.edit && !getEditorPreviewButton()) {
    // Preview requested by an editor closed since, e.g. by a project
    // switch : R is not told when a modal closes.
    return true;
  }
  // Taken before waiting : a close requested meanwhile cancels this read
  const generation = ++storyGeneration;
  if (storyClosing) {
    await storyClosing;
  }
  if (readStepsPending.size > 0) {
    // A superseded read stops at its next step : its step in progress
    // must end before this read changes the state.
    await maxWait(readStepsSettled(), closeWaitMax);
  }
  try {
    if (!isReadCurrent(generation)) {
      return true;
    }
    await init(opt);
    for (const step of readSteps) {
      if (!isReadCurrent(generation)) {
        return true;
      }
      await trackReadStep(step(generation));
    }
    if (!isReadCurrent(generation)) {
      return true;
    }
    // start  = infinite loop rendering
    start().catch((e) => {
      errorHandler(e);
    });
  } catch (e) {
    errorHandler(e);
    // A story built but not started has no exit : remove it.
    if (isReadCurrent(generation)) {
      await storyClose();
    }
  }
  return true;
}

/**
 * Test if a read is still the latest story read or close
 * @param {number} generation Generation of the read
 * @return {boolean} The read is current
 */
function isReadCurrent(generation) {
  return generation === storyGeneration;
}

/**
 * Keep a read step pending until it settles, for the close to wait on it
 * @param {Promise} prom Read step
 * @return {Promise} Read step
 */
function trackReadStep(prom) {
  readStepsPending.add(prom);
  return prom.finally(() => {
    readStepsPending.delete(prom);
  });
}

/**
 * Wait for the read steps in progress, failed or not
 * @return {Promise<Array>} Settled steps
 */
function readStepsSettled() {
  return Promise.allSettled([...readStepsPending]);
}

/**
 * Get the preview button of the story editor, a legacy R modal
 * @return {Element|null} Button, if the editor is open
 */
function getEditorPreviewButton() {
  return document.getElementById("btnViewPreviewStory");
}

async function init(opt) {
  const state = getState();

  // An update re-reads a playing story : its pending steps must stop.
  interruptStoryActivity();
  // Options not given are reset : a previous read must not leak its mode.
  Object.assign(
    state,
    { view: null, edit: false, update: false, autoStart: false },
    opt,
  );
  state.phase = "starting";

  if (state.elStory) {
    state.update = true;
    state.initScroll = state.elStory.scrollTop;
    state.stepUpdate = state.stepActive;
  }
  if (state.panels) {
    panels.batch(state.panels);
  }
  state.map = getMap();
  state.enable = false;
}

async function initListeners(generation) {
  removeAllListeners();
  /**
   * Edit mode
   */
  if (state.edit) {
    const isCurrent = () => isReadCurrent(generation);
    const { initEditing } = await import("./editor.js");
    await initEditing(state, isCurrent);
    if (!isCurrent()) {
      return;
    }
  } else {
    initMouseMoveListener();
  }

  /**
   * Init bullet container and listener
   */
  initKeydownListener();
  initClickListener();
  initResizeListener();
}

function removeAllListeners() {
  listeners.removeListenerByGroup("story_map");
}

function initClickListener() {
  const state = getState();
  /**
   * Locked
   */
  listeners.addListener({
    target: state.elStoryContainer,
    type: "click",
    callback: () => {
      if (state.ct_editor) {
        return;
      }
      storyMapShakeLock();
      new FlashItem("lock");
    },
    group: "story_map",
  });

  /**
   * Navigation bar events : step navigation, lock toggle, quit
   */
  listeners.addListener({
    target: state.elStoryNav,
    type: "mx-story-nav-goto",
    callback: (e) => requestStoryGoTo(e.detail.to),
    group: "story_map",
  });

  listeners.addListener({
    target: state.elStoryNav,
    type: "mx-story-nav-lock-toggle",
    callback: () => storyMapLock("toggle"),
    group: "story_map",
  });

  listeners.addListener({
    target: state.elStoryNav,
    type: "mx-story-nav-quit",
    callback: storyClose,
    group: "story_map",
  });
}

/**
 * Init listener for keydown event on window
 */
function initKeydownListener() {
  const map = getMap();
  const state = getState();
  state.map_keyboard_enabled = map.keyboard.isEnabled();

  if (state.map_keyboard_enabled) {
    map.keyboard.disable();
  }

  listeners.addListener({
    target: window,
    type: "keydown",
    callback: storyHandleKeyDown,
    group: "story_map",
    onRemove: () => {
      if (state.map_keyboard_enabled) {
        map.keyboard.enable();
      }
    },
  });
}

/**
* Init listener for mousemove event on window
# @param {Object} o Story options
*/
function initMouseMoveListener() {
  const s = getSettings();
  let timer;
  let destroyed = false;
  let idFrameHideShow;
  const elBody = document.body;
  const elCtrls = elBody.querySelectorAll(`
      .mx-story-nav__group,
      .maplibregl-ctrl-bottom-left,
      .maplibregl-ctrl-bottom-right,
      .maplibregl-ctrl-top-right,
      .button-panel--main
      `);
  //.button-panel--main : hidden or displayed by user choice

  const classOpacitySmooth = "mx-smooth-opacity";
  const classNoCursor = "nocursor";

  for (const elCtrl of elCtrls) {
    elCtrl.classList.add(classOpacitySmooth);
  }

  listeners.addListener({
    target: window,
    callback: mouseHider,
    type: ["mousemove", "click", "wheel"],
    group: "story_map",
    onRemove: destroy,
  });

  events.on("story_step", mouseHider);

  function mouseHider() {
    if (timer) {
      clearTimeout(timer);
    }

    if (s.opacity_auto_timeout === 0) {
      return;
    }

    show();
    timer = setTimeout(() => {
      if (!destroyed) {
        hide();
      }
    }, s.opacity_auto_timeout || 1000);
  }

  function hide() {
    cancelFrame(idFrameHideShow);
    idFrameHideShow = onNextFrame(() => {
      elCtrls.forEach((el) => {
        el.style.opacity = 0.25;
      });
      elBody.classList.add(classNoCursor);
    });
  }

  function show() {
    cancelFrame(idFrameHideShow);
    idFrameHideShow = onNextFrame(() => {
      elCtrls.forEach((el) => {
        el.style.opacity = 1;
      });
      elBody.classList.remove(classNoCursor);
    });
  }

  function clean() {
    elCtrls.forEach((el) => {
      el.style.opacity = 1;
      el.classList.remove(classOpacitySmooth);
    });
  }

  function destroy() {
    destroyed = true;
    events.off("story_step", mouseHider);
    show();
    clean();
  }
}

async function initSettings() {
  const story = getStory();
  const sSettings = path(story, "settings", {});

  if (settingsMapx.mode.static) {
    storySettings.panel_disable = ["notif_panel"];
  }
  story._settings = Object.assign({}, storySettings, sSettings);
}

function getSettings() {
  const story = getStory();
  return story._settings;
}

/**
 * Check if a story is playing
 * @return {Boolean} story is playing
 */
export function isStoryPlaying() {
  const state = getState();
  return state.enable === true;
}

/**
 * Get story id
 * @return {String} Story views' id
 */

export function getStoryId() {
  const state = getState();
  if (!state.enable) {
    return null;
  }
  return state.idView;
}

/**
 * Get current state
 */
function getState() {
  return state;
}

function getStory() {
  return story || {};
}

/**
 * Clear active views and story views
 * - A story view still rendering is not yet active : its clear is queued
 *   after the render, which removes what a late render adds.
 */
export async function cleanRemoveViews() {
  const state = getState();
  const elLegendContainer = state?.button_legend?.elPanelContent;
  const idViews = new Set([...getViewsActive(), ...getStoryViewsId()]);

  // Queued at once : a view re-added after a clear that timed out is
  // queued after that clear, not before.
  await Promise.allSettled(
    [...idViews].map((idView) => viewClear({ idView, elLegendContainer })),
  );
  return true;
}

/**
 * Remove ui elements
 * - Elements are removed even if the build failed midway
 */
function storyUiClear() {
  const state = getState();
  state.elStory?.remove();
  state.elStoryContainer?.remove();
  state.elStoryNav?.remove();
  state._init_ui = false;
}

/**
 * Close current story if any : playing, starting, or left without
 * exit by a failed start.
 * @return {Promise<void>}
 */
export function storyClose() {
  // Also cancels a read waiting for the close in progress
  storyGeneration++;
  if (storyClosing) {
    return storyClosing;
  }
  const state = getState();
  if (isEmpty(state.phase)) {
    return Promise.resolve();
  }
  storyClosing = storyCloseNow().finally(() => {
    storyClosing = null;
  });
  return storyClosing;
}

async function storyCloseNow() {
  const state = getState();
  try {
    // Remove the story first : steps below may fail, and waits depend
    // on views' user code.
    state.enable = false;
    state.phase = "closing";
    // Synchronous : the story disappears on the close request
    runSafe(interruptStoryActivity);
    runSafe(removeAllListeners);
    runSafe(storyUiClear);
    events.fire("story_close");
    if (state.ct_editor_remove) {
      runSafe(state.ct_editor_remove);
    }
    await waitTimeoutAsync(100);
    await maxWait(
      Promise.allSettled([
        runSafe(storyStop),
        ...(state.storyOperations || []),
        readStepsSettled(),
      ]),
      closeWaitMax,
    );
    await storyMapLock("lock");
    new FlashItem("sign-out");
    await appStateRestore();
  } catch (e) {
    console.warn(e);
  } finally {
    await cleanState();
  }
}

export async function storyStop() {
  const map = getMap();
  try {
    map.stop(false);
    await cancelAll();
  } catch (e) {
    console.warn(e);
  }
  const mapBusy = !map.isStyleLoaded();
  if (mapBusy) {
    // Continuous source updates can prevent idle
    await maxWait(map.once("idle"), closeWaitMax);
  }
}

/**
 * Cancel all DOM processes and network requests
 * -> does not block async code and timeouts
 * -> see https://jsfiddle.net/fxi/u6ftLg9h/
 */
async function cancelAll() {
  if (isFirefox()) {
    /**
     * Firefox breaks Shiny websocket when using window.stop.. "
     */
    return;
  }
  window.stop();
}

async function cleanState() {
  const story = getStory();
  const state = getState();

  for (const k in story) {
    delete story[k];
  }

  for (const k in state) {
    delete state[k];
  }
}

/**
 * Get story view or fetch it remotely
 */
async function initStory(generation) {
  const state = getState();
  const view = await getViewAuto(state.view || state.idView);
  if (!isReadCurrent(generation)) {
    // The state now belongs to the close or to a newer read
    return;
  }
  state.view = view;
  if (isStory(state.view)) {
    state.idView = state.view.id;
  } else {
    modal({
      title: "Error",
      content: "Invalid or empty story",
      addBackground: true,
    });
    // A re-read leaves a story on screen : the read's close removes it
    if (!state.elStory) {
      await cleanState();
    }
    throw new Error("No story to read");
  }
  Object.assign(story, state.view.data.story);
}

/**
 * Start
 */
async function start() {
  const state = getState();

  if (state.enable) {
    throw new Error("Story already playing");
  }
  state.enable = true;
  state.phase = "playing";

  if (state.update) {
    events.fire("story_update");
  } else {
    events.fire("story_start");
  }
  /**
   * Initial layout
   */
  updateScrollRect();
  updateLayout();

  /**
   * Handle update step
   */
  if (state.initScroll) {
    state.elStory.scrollTop = state.initScroll;
  }

  if (isNotEmpty(state.stepUpdate)) {
    state.stepActive = null;
    await cleanRemoveViews();
    await storyGoTo(state.stepUpdate);
  }
  /**
   * Render
   */
  await render();

  /* main animation loop */
  async function render() {
    if (!state.enable) {
      return;
    }
    await waitFrameAsync();
    const sd = state.scrollData;

    // NOTE: scrollTop does not reflect actual dimension but non scaled ones.
    const posNow = state.elStory.scrollTop * state.scaleWrapper || 1;
    const posLast = sd.distTop;
    if (posLast === posNow) {
      return render();
    }

    sd.distTop = posNow;
    await storyUpdateSlides();
    return render();
  }
}

/**
 * Update layout on resize
 */

function initResizeListener() {
  listeners.addListener({
    target: window,
    type: "resize",
    callback: updateLayout,
    group: "story_map",
  });
}

/**
 * Init values for screen adaptiveness/scaling function
 * @param {Object} o story options
 */
async function initAdaptiveLayout() {
  const state = getState();
  const s = getSettings();

  /**
   * Reset if needed
   */
  resetMapStyle();

  /**
   * Save style map : used when reset
   */
  state.classMap = state.elMapContainer.className;
  state.styleMap = state.elMapContainer.style;

  /**
   * Add wrapper classes
   */
  state.elMapContainer.classList.add(s.class_container);
  state.elMapContainer.classList.add(s.class_wrapper);
  state.elStoryContainer.classList.add(s.class_wrapper);

  /**
   * Initial rect story for sizing
   */

  state.rectStory = state.elStory.getBoundingClientRect();
}
function updateAdaptiveLayout() {
  const state = getState();
  state.scaleWrapper = Math.min(
    window.innerWidth / state.rectStory.width,
    window.innerHeight / state.rectStory.height,
  );

  const height = state.rectStory.height * state.scaleWrapper;
  const width = state.rectStory.width * state.scaleWrapper;
  state.elStoryContainer.style[cssTransform] =
    `translate(-50%,-50%) scale(${state.scaleWrapper})`;
  state.elMapContainer.style.height = `${height}px`;
  state.elMapContainer.style.width = `${width}px`;
  state.elMapContainer.style[cssTransform] = "translate(-50%,-50%)";
  state.map.resize();
}

/**
 * Get current views featured in step
 * @param {Boolean} onlyCurrentStep Only list current step views id
 * @return {Array} array of views id
 */
export function getStoryViewsId(onlyCurrentStep) {
  const views = [];
  const story = getStory();
  const state = getState();
  for (const step of story.steps || []) {
    if (onlyCurrentStep) {
      if (step !== state?.step) {
        continue;
      }
    }
    for (const item of step.views || []) {
      const idView = getStepViewId(item);
      if (isViewId(idView)) {
        views.push(idView);
      }
    }
  }
  return views;
}

function emitStoryRead(stepNum, nSteps) {
  const state = getState();
  const shouldSkip =
    state.storyReadLogged ||
    state.edit === true ||
    state.preview === true ||
    !isViewId(state.idView);

  if (shouldSkip) {
    return;
  }

  const hasSingleStep = nSteps === 1;
  const hasReachedSecondStep = nSteps > 1 && stepNum >= 1;
  const hasReadStory = hasSingleStep || hasReachedSecondStep;

  if (!hasReadStory) {
    return;
  }

  state.storyReadLogged = true;
  events.fire("story_read", {
    idView: state.idView,
  });
}

/**
 * Get view id
 * -> Story schema used to work with different format for storing views
 * @param {Any} item Item that contain a view id
 * @returns {String} id of the view
 */
function getStepViewId(item) {
  if (isViewId(item)) {
    return item;
  } else if (isViewId(item.view)) {
    return item.view;
  } else if (isView(item)) {
    return item.id;
  } else if (isView(item.view)) {
    return item.view.id;
  }
}

/**
 * Set scroll state values
 */
function updateScrollRect() {
  const state = getState();
  const elStory = state.elStory;
  const rect = elStory.getBoundingClientRect();

  if (!state.scrollData) {
    state.scrollData = {};
  }
  const sd = state.scrollData;
  sd.elStory = elStory;
  sd.rect = rect;
  sd.height = rect.height;
  sd.trigger = rect.height * 0.5;
  sd.distTop = -1;
}

/**
 * Update layout
 */
function updateLayout() {
  updateScrollRect();
  updateAdaptiveLayout();
  setStepConfig();
}

async function initControls() {
  const state = getState();
  const s = getSettings();
  if (state._init_buttons) {
    return;
  }
  state._init_buttons = true;
  /**
   * Control panel buttons
   */
  state.ctrlMode3d = controls.get(s.ctrl_btn_3d_terrain);
  state.ctrlAerial = controls.get(s.ctrl_btn_theme_sat);
  state.ctrlLock = controls.get(s.ctrl_btn_lock);
}

/**
 * Set step config : dimention, number, bullets
 */
function setStepConfig() {
  const state = getState();
  const sd = state.scrollData;
  const elSteps = state.elStory.querySelectorAll(".mx-story-step");

  state.stepsConfig = [];
  let s = 0;
  for (const elStep of elSteps) {
    s++;
    /*
     * config init
     */
    const config = {};
    const stepName = elStep.dataset.step_name;
    const rect = elStep.getBoundingClientRect();

    config.elStep = elStep;
    config.elSlides = elStep.querySelectorAll(".mx-story-slide");
    config.slidesConfig = [];
    config.name = stepName;

    /*
     * Save step dimensions
     */
    config.end = s * rect.height;
    config.start = config.end - rect.height;
    config.startUnscaled = config.start * (1 / state.scaleWrapper);
    config.height = rect.height;
    config.width = rect.width;

    /*
     * Evaluate slides and save in config
     */
    for (const elSlide of config.elSlides) {
      const slideConfig = [];
      try {
        const slideConfigJSON = elSlide.dataset.slide_config;
        const validJSON = isJson(slideConfigJSON);
        if (validJSON) {
          slideConfig.push(...JSON.parse(slideConfigJSON || "[]"));
        }
      } catch (e) {
        console.error(e, slideConfig);
      }
      config.slidesConfig.push(slideConfig);
    }

    state.stepsConfig.push(config);
  }

  /**
   * Navigation bar : steps list + quit button visibility
   */
  state.elStoryNav?.configure({
    steps: state.stepsConfig.map((c) =>
      getStepPreviewData({ elStep: c.elStep, name: c.name }),
    ),
    aspectRatio:
      state.stepsConfig[0]?.width / state.stepsConfig[0]?.height || 1,
    activeIndex: state.stepActive || 0,
    showQuit: !(state.autoStart || state.update),
  });

  /**
   * Set initial scroll position
   */
  if (sd.distTop) {
    state.elStory.scrollTop = sd.distTop * 1;
  }
}

async function storyUpdateSlides() {
  /*
   * Apply style
   */
  const state = getState();
  const sd = state.scrollData;
  const sc = state.stepsConfig;
  let percent = 0;
  let elSlides;
  let elStep;
  let isActive, isInRange, isInRangeAnim, toActivate;
  let clHidden = "mx-visibility-hidden";
  let clRemove = "mx-display-none";
  let isHidden = false;
  let config;
  if (!state.enable) {
    return;
  }
  for (let s = 0, sL = sc.length; s < sL; s++) {
    /**
     *   1       2       s       e       5       6
     *   |.......|.......|.......|.......|.......|
     *                t|.......|b
     */
    config = sc[s];
    percent = ((config.end - sd.distTop) / (config.height * 2)) * 100;
    isInRange = percent < 75 && percent >= 25;
    isInRangeAnim = percent < 600 && percent >= -500;
    isActive = state.stepActive === s;
    toActivate = isInRange && !isActive;
    elStep = config.elStep;
    elSlides = config.elSlides;
    isHidden = elStep.classList.contains(clHidden);

    /**
     * Update slide animation
     */
    if (isInRangeAnim) {
      if (isHidden) {
        elStep.classList.remove(clHidden);
      }
      let i = 0;
      for (const elSlide of elSlides) {
        const slideTransform = storySetTransform({
          config: config.slidesConfig[i++],
          percent: percent,
        });
        elSlide.classList.remove(clRemove);
        elSlide.style[cssTransform] = slideTransform;
      }
    } else if (!isHidden) {
      elStep.classList.add(clHidden);
      for (const elSlide of elSlides) {
        elSlide.classList.add(clRemove);
      }
    }

    if (toActivate) {
      if (state.storyStepPending === null || state.storyStepPending !== s) {
        state.storyStepPending = s;
        storyPlayStep(s)
          .finally(() => {
            if (state.storyStepPending === s) {
              state.storyStepPending = null;
            }
          })
          .catch(() => {});
        break;
      }
    }
  }
}

async function updateBullets() {
  const state = getState();
  state.elStoryNav?.setActiveIndex(state.stepActive);
}

/*
 * listen for keydown
 */

const keyState = {
  keys: [],
  idTimeout: 0,
};

// Outlives the story state : an operation left by a closed story must not
// match a token of the next story.
let storyOperationToken = 0;

function getStoryOperationToken() {
  return storyOperationToken;
}

function isStoryOperationCurrent(state, token) {
  return state.enable && getStoryOperationToken() === token;
}

function trackStoryOperation(state, operation) {
  if (!state.storyOperations) {
    state.storyOperations = new Set();
  }
  state.storyOperations.add(operation);
  operation
    .finally(() => state.storyOperations?.delete(operation))
    .catch(() => {});
  return operation;
}

function interruptStoryActivity({
  clearNumeric = true,
  stopAutoplay = true,
} = {}) {
  const state = getState();
  storyOperationToken++;
  state.storyStepPending = null;
  cancelScrollFromTo();
  state.map?.stop(false);
  if (stopAutoplay) {
    state.autoplay = false;
  }
  if (clearNumeric) {
    clearTimeout(keyState.idTimeout);
    keyState.idTimeout = 0;
    keyState.keys.length = 0;
  }
  return storyOperationToken;
}

function requestStoryGoTo(to, useTimeout) {
  const operationToken = interruptStoryActivity();
  return storyGoTo(to, useTimeout, null, operationToken);
}

async function storyHandleKeyDown(event) {
  const state = getState();

  if (!state.enable) {
    return;
  }

  const editMode = state.edit === true;
  const isEditing = editMode && state?.ct_editor?.isEditing();
  const editAndMapFocus = editMode && !isEditing && hasFocusOnMap();
  const valid = !editMode || editAndMapFocus;

  if (!valid) {
    return;
  }

  const isNum = isNumeric(event.key);

  if (isNum) {
    /*
     * Combo : 1 ... 2 -> 12
     */
    prevent();
    interruptStoryActivity({ clearNumeric: false });
    clearTimeout(keyState.idTimeout);
    keyState.keys.push(event.key);
    keyState.idTimeout = setTimeout(async () => {
      try {
        const sNum = keyState.keys.join("") * 1;
        keyState.keys.length = 0;
        requestStoryGoTo(sNum - 1);
      } catch (e) {
        console.warn(e);
      }
    }, 200);
    return;
  }

  switch (event.key) {
    case "Escape":
      if (!state.autoStart && !state.edit) {
        prevent();
        await storyClose();
      }
      break;
    case "l":
      prevent();
      state.ctrlLock.action("toogle");
      break;
    case " ":
      prevent();
      await storyAutoPlay("start");
      break;
    case "ArrowDown":
    case "ArrowRight":
      prevent();
      requestStoryGoTo("next");
      break;
    case "ArrowUp":
    case "ArrowLeft":
      prevent();
      requestStoryGoTo("previous");
      break;
    default:
      return;
  }

  function prevent() {
    event.preventDefault();
    event.stopPropagation();
  }
}

export async function storyGoTo(
  to,
  useTimeout,
  funStop,
  operationToken = null,
) {
  const state = getState();
  if (operationToken === null) {
    operationToken = interruptStoryActivity();
  }
  const story = getStory();
  const steps = story.steps;
  const stepsDim = state.stepsConfig;
  const elStory = state.elStory;
  const height = state.rectStory.height;
  const start = elStory.scrollTop;
  const currentStep = state.currentStep || 0;
  let timeout = 0;
  let nextStep;
  let previousStep;
  let destStep;
  const maxStep = steps.length - 1;

  switch (to) {
    case "next":
    case "n":
      nextStep = currentStep + 1;
      destStep = nextStep > maxStep ? 0 : nextStep;
      break;
    case "previous":
    case "p":
      previousStep = currentStep - 1;
      destStep = previousStep < 0 ? maxStep : previousStep;
      break;
    default:
      if (isNumeric(to)) {
        destStep = to >= maxStep ? maxStep : to < 0 ? 0 : to;
      }
  }

  const stop = stepsDim[destStep].startUnscaled;
  const step = steps[currentStep];
  const easing = path(step, "autoplay.easing") || "easeIn";
  const duration = path(step, "autoplay.duration") || 1000;
  const easing_p = path(step, "autoplay.easing_power") || 1;

  if (useTimeout) {
    timeout = path(step, "autoplay.timeout") || 1000;
  }

  const easeFun = easingFun({
    type: easing,
    power: easing_p,
  });

  const jump = state.storyGoToDone === false || Math.abs(stop - start) > height;

  state.storyGoToDone = false;

  const promScroll = scrollFromTo({
    emergencyStop: () =>
      !isStoryOperationCurrent(state, operationToken) ||
      (funStop instanceof Function && funStop()),
    timeout: timeout,
    el: elStory,
    from: start,
    to: stop,
    jump: jump,
    during: duration,
    using: easeFun,
  });

  await maxWait(promScroll, duration + timeout);

  if (isStoryOperationCurrent(state, operationToken)) {
    state.storyGoToDone = true;
  }

  return {
    step: destStep,
    end: destStep === maxStep,
  };
}

/**
 * Wait for a promise, at most duration ms
 * @param {Promise} prom Promise to wait for
 * @param {number} duration Max wait in ms
 * @return {Promise} Promise result, or true on timeout
 */
function maxWait(prom, duration) {
  let idTimeout;
  const timeout = new Promise((resolve) => {
    idTimeout = setTimeout(() => {
      resolve(true);
    }, duration);
  });
  return Promise.race([prom, timeout]).finally(() => {
    clearTimeout(idTimeout);
  });
}

export async function storyAutoPlay(cmd, operationToken = null) {
  const state = getState();
  const enabled = state.autoplay || false;
  const playStart = cmd === "start" && !enabled;
  const playStop = (cmd === "stop" && enabled) || (cmd === "start" && enabled);
  const playNext = cmd === "next" && enabled;

  if (playStart) {
    operationToken = interruptStoryActivity({ stopAutoplay: false });
  } else if (playNext && operationToken === null) {
    operationToken = interruptStoryActivity({ stopAutoplay: false });
  }

  const stopControl = function () {
    return state.autoplay === false;
  };

  if (playStart) {
    new FlashItem("play");
    state.autoplay = true;
    storyAutoPlay("next", operationToken);
  }

  if (playStop) {
    interruptStoryActivity();
    state.autoplay = false;
    new FlashItem("stop");
  }

  if (playNext) {
    await storyGoTo("next", true, stopControl, operationToken);
    if (state.autoplay && isStoryOperationCurrent(state, operationToken)) {
      storyAutoPlay("next", operationToken);
    }
  }
  return state.autoplay;
}

/**
 * Lock button request user attention
 */
export function storyMapShakeLock() {
  const isLocked = storyMapLock("test");

  if (isLocked) {
    state.elStoryNav?.shakeLock();
  }
}

/**
 * Control map pan during story map
 * @param {String} cmd Action : recalc, unlock, toggle;
 */
export async function storyMapLock(cmd) {
  try {
    const state = getState();
    const valid = ["test", "recalc", "lock", "unlock", "toggle"].includes(cmd);
    if (!valid) {
      cmd = "toggle";
    }
    const btn = state.ctrlLock;
    const elButton = btn.elButton;
    const elIcon = elButton.querySelector(".fa");
    const elStoryContainer = state.elStoryContainer;
    const classLock = "fa-lock";
    const classUnlock = "fa-unlock";
    const classNoEvent = "mx-events-off";
    const isLocked = elIcon.classList.contains(classLock);
    const isUnlocked = !isLocked;
    const isRecalc = cmd === "recalc";
    const isTest = cmd === "test";

    if (isTest) {
      return isLocked;
    }

    const cases = {
      unlock: true,
      lock: false,
      recalc: !isLocked,
      toggle: isLocked,
    };

    const toUnlock = cases[cmd];
    const hasChanged = toUnlock !== isUnlocked;

    if (toUnlock) {
      elIcon.classList.remove(classLock);
      elIcon.classList.add(classUnlock);
      elStoryContainer.classList.add(classNoEvent);
      if (!isRecalc && hasChanged) {
        new FlashItem("unlock");
      }
    } else {
      events.fire("story_lock");
      elIcon.classList.add(classLock);
      elIcon.classList.remove(classUnlock);
      elStoryContainer.classList.remove(classNoEvent);
      if (!isRecalc && hasChanged) {
        new FlashItem("lock");
      }
    }
    state.elStoryNav?.setLocked(!toUnlock);
  } catch (e) {
    console.warn(e);
  }
}

async function storyControlsEnable() {
  const s = getSettings();
  const state = getState();
  const autoStart = state.autoStart === true;
  const update = state.update === true;

  if (state._controls_enabled) {
    return;
  }
  state._controls_enabled = true;

  state.controlsAdded = [];
  state.controlsRemoved = [];
  state.panelsRemoved = [];

  const keyBtnShow = [];
  /**
   * Controls
   */
  if (autoStart || update) {
    keyBtnShow.push(...s.ctrl_btn_enable_update_mode);
  } else {
    keyBtnShow.push(...s.ctrl_btn_enable);
  }

  for (const key of s.ctrl_btn_disable) {
    const ctrl = controls.get(key);
    if (!ctrl) {
      continue;
    }
    state.controlsRemoved.push(ctrl);
  }
  for (const key of keyBtnShow) {
    const ctrl = controls.get(key);
    if (!ctrl) {
      continue;
    }
    ctrl.show();
    state.controlsAdded.push(ctrl);
  }

  /**
   * Panels
   */
  const panelDisable = s.panel_disable;
  if (isNotEmpty(panelDisable)) {
    panels.hide(panelDisable);
    state.panelsRemoved.push(...panelDisable);
  }

  /**
   * Preview button ( edit mode )
   */
  const elBtnPreview = getEditorPreviewButton();
  if (elBtnPreview) {
    elBtnPreview.removeAttribute("disabled");
  }

  /**
   * Set control map pan lock mode
   */
  await storyMapLock("recalc");
}

async function initTheme(generation) {
  const s = getSettings();
  const useTheme = isNotEmpty(s.theme) && s.theme !== "default";
  const idThemeSaved = getState().idTheme;
  /*
   * Set theme
   */
  if (useTheme) {
    await theme.set(s.theme, { sound: false, save: false, save_url: false });
    if (!isReadCurrent(generation) && isNotEmpty(idThemeSaved)) {
      // Closed during a remote theme fetch : theme.set skipped the restore
      await theme.set(idThemeSaved, {
        sound: false,
        save: false,
        save_url: true,
      });
    }
  }
}

async function initProjection() {
  const s = getSettings();
  const useProj =
    isNotEmpty(s.projection_name) && s.projection_name !== "default";
  /*
   * Set projection
   */
  if (useProj) {
    await setMapProjection({ name: s.projection_name });
  }
}

async function initState(generation) {
  const state = getState();
  const map = getMap();
  if (state._app_state_saved) {
    return;
  }
  state._app_state_saved = true;
  /**
   * Enable story controls
   */
  await storyControlsEnable();

  /**
   * Get controls status
   */
  const hasAerial = state.ctrlAerial.isActive();
  const has3d = state.ctrlMode3d.isActive();

  /**
   * Get map / view set
   */
  const position = getMapPos();
  const oldViews = getViewsActive();
  const maxBounds = map.getMaxBounds();

  /**
   * Release max bounds / bbox;
   */
  map.setMaxBounds();

  /**
   * Theme
   */
  const idTheme = theme.id();

  /**
   * Projection
   */
  const projection = map.getProjection();

  /*
   * save in state : a close during the views removal restores them
   */
  Object.assign(state, {
    idTheme,
    projection,
    oldViews,
    position,
    maxBounds,
    hasAerial,
    has3d,
  });

  /**
   * Clear views
   * viewRemove also close the UI item
   */
  for (const id of oldViews) {
    if (!isReadCurrent(generation)) {
      return;
    }
    await viewRemove(id);
  }

  /**
   * Hide modes
   */
  state.ctrlAerial.action("hide");
  state.ctrlMode3d.action("hide");
  controls.sizeOptimizer();
}

/**
 * Restore the app state saved by initState
 * - Each step runs even if a previous one failed
 * - A story closed before initState only removes what it added
 */
async function appStateRestore() {
  const state = getState();
  const map = getMap();
  const hasSavedState = isNotEmpty(state.position);
  /**
   * Restore
   */
  if (hasSavedState) {
    await runSafe(() => setMapProjection({ name: state?.projection?.name }));
    await runSafe(() => {
      const pos = state.position;
      map.jumpTo({
        zoom: pos.z,
        bearing: pos.b,
        pitch: pos.p,
        center: [pos.lng, pos.lat],
      });
      map.setMaxBounds(state.maxBounds);
    });
    runSafe(() =>
      theme.set(state.idTheme, { sound: false, save: false, save_url: true }),
    );
  }

  runSafe(resetMapStyle);
  runSafe(resetControls);
  runSafe(resetPanels);
  runSafe(removeLegendPanel);

  if (!hasSavedState) {
    // Views are removed by initState and added by steps : none changed
    return;
  }

  await maxWait(runSafe(cleanRemoveViews), closeWaitMax);

  // Sequential, to keep the views order, and awaited : nothing starts after
  // the close. One bound per view : a stalled view delays the others but
  // does not drop them. A view added after its bound can't be cancelled.
  for (const id of state.oldViews || []) {
    await maxWait(
      runSafe(() => viewAdd(id)),
      closeWaitMax,
    );
  }
}

/**
 * Run a close step, log its error
 * - A synchronous step stays synchronous
 * @param {Function} fun Step
 * @return {*} Step result, or a promise of it for an async step
 */
function runSafe(fun) {
  try {
    const res = fun();
    if (isPromise(res)) {
      return res.catch((e) => {
        console.warn(e);
      });
    }
    return res;
  } catch (e) {
    console.warn(e);
  }
}

function resetControls() {
  const state = getState();
  const hasSavedModes = isBoolean(state.hasAerial);
  if (hasSavedModes) {
    state.ctrlAerial.action(state.hasAerial ? "show" : "hide");
    state.ctrlMode3d.action(state.has3d ? "show" : "hide");
  }
  if (isArray(state.controlsAdded)) {
    for (const ctrl of state.controlsAdded) {
      ctrl.hide();
    }
  }
  if (isArray(state.controlsRemoved)) {
    for (const ctrl of state.controlsRemoved) {
      ctrl.show();
    }
  }
  controls.sizeOptimizer();
}
function resetPanels() {
  const state = getState();
  if (isEmpty(state.panelsRemoved)) {
    return;
  }
  panels.show(state.panelsRemoved);
}

async function initLegendPanel() {
  const state = getState();
  if (state.button_legend instanceof ButtonPanelLegend) {
    return;
  }
  /**
   * Button Legend
   */
  state.button_legend = new ButtonPanelLegend({
    id: "button_panel_legend_story",
    position: "bottom-left",
    tooltip_position: "right",
  });

  events.on({
    type: [
      "story_legend_update",
      "view_legend_updated",
      "view_removed",
      "view_added",
    ],
    idGroup: "story_legends",
    callback: debounce(updateLegendsSize, 500),
  });
}

function updateLegendsSize() {
  const state = getState();

  if (!state.enable) {
    return;
  }

  state.button_legend.resizeAuto("content");
}

function removeLegendPanel() {
  const state = getState();
  events.offGroup("story_legends");
  state.button_legend?.destroy();
  delete state.button_legend;
}

function resetMapStyle() {
  const state = getState();
  const map = getMap();
  if (state.styleMap) {
    state.elMapContainer.style = state.styleMap;
  }

  if (state.classMap) {
    state.elMapContainer.className = state.classMap;
  }
  map.resize();
}

/**
 * Build story ui
 */
async function build() {
  storyUiClear();
  await buildMain();
  await buildBullets();
  state._init_ui = true;
}

async function buildMain() {
  const glfo = getLabelFromObjectPath;
  const state = getState();
  const story = getStory();
  const s = getSettings();

  if (!story.steps || story.steps.length < 1) {
    return;
  }
  /**
   * Set default
   */
  state.elMapContainer = state.map.getContainer();
  state.elMapControls = state.elMapContainer.querySelector(
    `.${s.class_controls}`,
  );

  /**
   * Story map container
   */
  state.elStoryContainer = el("div", {
    class: s.class_container,
    id: s.id_story,
  });

  state.elStory = el(
    "div",
    {
      class: s.class_story,
    },
    story.steps.map((step, stepNum) => {
      /**
       * For each step
       */
      return el(
        "div",
        {
          class: s.class_step,
          dataset: {
            step_name: step.name,
          },
        },
        step.slides.map((slide, slideNum) => {
          const config = JSON.stringify(slide.effects || []);
          /**
           * For each slide
           */
          return el(
            "div",
            {
              dataset: {
                slide_config: config,
              },

              class: [s.class_slide].concat(
                slide.classes.map((c) => s.class_story + "-" + c.name),
                "mx-display-none",
              ),
            },
            el(
              "div",
              {
                class: s.class_slide_front,
                style: {
                  color: slide.color_fg || s.colors.fg,
                  borderColor: slide.color_fg || s.colors.fg,
                  fontSize: slide.size_text + "px" || s.sizes.text + "px",
                  overflowY: slide.scroll_enable ? "scroll" : "hidden",
                },
                dataset: {
                  editable: true,
                  name: stepNum + ":" + slideNum,
                },
              },
              glfo({
                obj: slide,
                path: "html",
                default: "<p></p>",
              }),
            ),
            el("div", {
              style: {
                backgroundColor: slide.color_bg || s.colors.bg,
                opacity:
                  slide.opacity_bg === 0
                    ? 0
                    : slide.opacity_bg || s.colors.alpha,
              },
              class: s.class_slide_back,
            }),
          );
        }), // end slides
      );
    }), // end steps
  );

  state.elStoryContainer.appendChild(state.elStory);
  state.elMapContainer.appendChild(state.elStoryContainer);
}

async function buildBullets() {
  const state = getState();
  /**
   * Navigation bar : quit, lock, step bullets, first/prev/next/last, grid
   */
  const { el: createElement } = new ElementCreator({
    document: state.elMapControls.ownerDocument,
  });
  state.elStoryNav = createElement("mx-story-navigation");
  state.elMapControls.appendChild(state.elStoryNav);
}

/**
 * Handle broken images : empty canvas
 */
async function handleMissingImages() {
  const state = getState();
  const imgs = state.elStory.querySelectorAll("img");
  for (const img of imgs) {
    img.onerror = () => {
      const imgRect = img.getBoundingClientRect();
      const W = Math.ceil(imgRect.width);
      const H = Math.ceil(imgRect.height);
      const elCanvas = createCanvas(W, H);
      const elParent = img.parentElement;
      elParent.appendChild(elCanvas);
      img.remove();
    };
  }
}

const tf = {
  0: () => {
    return "";
  },
  1: (p) => {
    return "translate3d(" + p + "%,0,0)";
  },
  2: (p) => {
    return "translate3d(0," + p + "%,0)";
  },
  3: (p) => {
    return "translate3d(0,0," + p + "px)";
  },
  4: (p) => {
    p = p * 3.6;
    return "rotate3d(1,0,0," + p + "deg)";
  },
  5: (p) => {
    p = p * 3.6;
    return "rotate3d(0,1,0," + p + "deg)";
  },
  6: (p) => {
    p = p * 3.6;
    return "rotate3d(0,0,1," + p + "deg)";
  },
  7: (p) => {
    p = p / 100 + 1;
    return "scale(" + p + ")";
  },
};

/*
 * Set slide style translate based on dataset
 * @param {Object} o option
 * @param {Array} o.config Style config array
 * @param {Number} o.percent Percent of anim
 */
export function storySetTransform(o) {
  /* all transformations */
  const tt = [];
  /* Reverse percentage : start at 0, finish at 100 */
  let p = 100 - o.percent;

  for (const d of o.config) {
    /* limit percentage to start->end range*/
    if (p <= d.s) {
      p = d.s;
    }
    if (p >= d.e) {
      p = d.e;
    }

    /* modify the offset. Default middle is expected to be at 50%*/
    p = p - 50 + d.o;

    /* add a factor to transformation percentage */
    p = p * d.f;

    /* add to transformations */
    tt.push(tf[d.t](p));
  }

  return tt.join(" ");
}

export function storyPlayStep(stepNum) {
  const state = getState();
  const operationToken = getStoryOperationToken();
  return trackStoryOperation(state, storyPlayStepImpl(stepNum, operationToken));
}

async function storyPlayStepImpl(stepNum, operationToken) {
  try {
    const state = getState();
    if (!isStoryOperationCurrent(state, operationToken)) {
      return;
    }

    const story = getStory();
    const settings = getSettings();
    const steps = path(story, "steps", []);
    const elLegendContainer = state?.button_legend?.getContainer();
    const map = state.map;
    if (steps.length === 0) {
      return;
    }
    const step = steps[stepNum] || {};
    if (isEmpty(step)) {
      return;
    }
    if (!isStoryOperationCurrent(state, operationToken)) {
      return;
    }
    map.stop();
    events.fire("story_step");
    /**
     * Lock behaviour : root setting, overridable per step
     */
    const lockBehaviour = resolveLockBehaviour(settings, step);
    storyMapLock(lockBehaviour === "unlocked" ? "unlock" : "lock");

    /**
     * retrieve step information
     */
    state.currentStep = stepNum;
    state.stepActive = stepNum;
    state.step = step;

    emitStoryRead(stepNum, steps.length);

    await updateBullets();
    if (!isStoryOperationCurrent(state, operationToken)) {
      return;
    }

    const pos = step.position;
    const anim = Object.assign(
      {},
      {
        duration: 1000,
        easing: "easeIn",
        easing_power: 1,
        method: "easeTo",
      },
      step.animation,
    );
    const easing = easingFun({
      type: anim.easing,
      power: anim.easing_power,
    });
    /**
     * Set base map mode
     */
    if (step.base_layer) {
      const actionAerial = step.base_layer.add_aerial ? "show" : "hide";
      const actionTerrain = step.base_layer.add_3d_terrain ? "show" : "hide";
      state.ctrlAerial.action(actionAerial);
      state.ctrlMode3d.action(actionTerrain);
    }

    /**
     * Fly to position
     */
    if (anim.method === "fitBounds") {
      for (const p of ["w", "e", "s", "n"]) {
        if (isEmpty(pos[p])) {
          pos[p] = 0;
          console.warn(`Missing position ${p} to fitbounds`);
        }
      }
      const posN = normalizeDestinationPos(pos, "w");
      map.fitBounds([posN.w, posN.s, posN.e, posN.n], {
        duration: anim.duration,
        pitch: posN.pitch,
        easing: easing,
      });
    } else {
      const posN = normalizeDestinationPos(pos, "lng");
      map[anim.method]({
        duration: anim.duration,
        zoom: posN.z,
        easing: easing,
        bearing: posN.bearing,
        pitch: posN.pitch,
        center: [posN.lng, posN.lat],
      });
    }

    /**
     * Views set
     */
    const vStep = step.views.map(getStepViewId);
    const vVisible = getViewsActive();
    const vToRemove = getArrayDiff(vVisible, vStep);
    const vToAdd = getArrayDiff(vStep, vVisible);

    /**
     * Add views if not alredy there
     */
    let i = 0;
    for (const v of vToAdd) {
      if (!isStoryOperationCurrent(state, operationToken)) {
        return;
      }
      const vPrevious = vStep[i++ - 1] || settingsMapx.layerBefore;
      await viewRender({
        idView: v,
        openView: false,
        addTitle: true,
        before: vPrevious,
        elLegendContainer,
      });
      if (!isStoryOperationCurrent(state, operationToken)) {
        return;
      }
    }

    /**
     * Remove views not used
     */
    for (const v of vToRemove) {
      if (!isStoryOperationCurrent(state, operationToken)) {
        return;
      }
      await viewClear({
        idView: v,
        elLegendContainer,
      });
      if (!isStoryOperationCurrent(state, operationToken)) {
        return;
      }
    }

    if (!isStoryOperationCurrent(state, operationToken)) {
      return;
    }

    viewsLayersOrderUpdate({
      order: vStep,
      origin: "story_map",
    });

    await viewsLegendsOrderUpdate({
      elContainer: elLegendContainer,
      order: vStep,
    });

    if (!isStoryOperationCurrent(state, operationToken)) {
      return;
    }

    await updatePanelBehaviour(settings, step, operationToken);
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Update legend position
 * @param {Object} opt options
 * @param {Element} opt.elContainer Legend Container element
 * @param {Array} opt.order Array of view id to sort legend
 */

async function viewsLegendsOrderUpdate(opt) {
  let pos = 0;
  for (const idView of opt.order) {
    const elLegend = opt.elContainer.querySelector(
      `[data-id_view="${idView}"]`,
    );
    if (elLegend) {
      elLegend.style.order = pos++;
    }
  }
}

/**
 * Resolve lock behaviour : root setting wins unless "default",
 * else step setting wins unless "default", else fall back to the
 * historical unconditional lock.
 * @param {Object} settings Story root settings (story._settings)
 * @param {Object} step Active step config
 * @return {String} "locked" or "unlocked"
 */
function resolveLockBehaviour(settings, step) {
  const lDefault = "default";
  const lRoot = path(settings, "lock_behaviour", null);
  const lStep = path(step, "lock_behaviour", null);
  if (lRoot && lRoot !== lDefault) {
    return lRoot;
  }
  if (lStep && lStep !== lDefault) {
    return lStep;
  }
  return "locked";
}

async function updatePanelBehaviour(settings, step, operationToken) {
  const state = getState();
  if (!isStoryOperationCurrent(state, operationToken)) {
    return;
  }

  const idViews = path(step, "views", []).map(getStepViewId);

  /**
   * Set dashboard panel behaviour
   * -> used in buildDashboard()
   */
  const dDefault = "default";
  const dClosed = "closed";
  const dRoot = path(settings, "dashboards_panel_behaviour", null);
  const dStep = path(step, "dashboards_panel_behaviour", null);
  let dBehaviour;

  if (settingsMapx.initClosedPanels) {
    dBehaviour = dClosed;
  } else if (dRoot && dRoot !== dDefault) {
    dBehaviour = dRoot;
  } else if (dStep && dStep !== dDefault) {
    dBehaviour = dStep;
  } else {
    dBehaviour = dDefault;
  }

  if (dBehaviour === "disabled") {
    dashboard.remove();
  } else {
    /**
     * Add widgets if any
     */
    for (const v of idViews) {
      if (!isStoryOperationCurrent(state, operationToken)) {
        return;
      }
      // A view kept from the previous step keeps its widgets.
      if (dashboard.hasViewWidgets(v)) {
        continue;
      }
      await dashboard.addWidgetsToView(v);
      if (!isStoryOperationCurrent(state, operationToken)) {
        return;
      }
    }

    /**
     * If a dashboard exists, apply behaviour
     */
    switch (dBehaviour) {
      case "open":
        if (!isStoryOperationCurrent(state, operationToken)) {
          return;
        }
        await dashboard.exec("show");
        break;
      case "closed":
        if (!isStoryOperationCurrent(state, operationToken)) {
          return;
        }
        await dashboard.exec("hide");
        break;
      default:
        /**
         * Get the the default from the first
         * view with config
         */
        for (const v of idViews) {
          const config = dashboard.getConfigFromView(v);
          if (!config) {
            continue;
          }
          if (config.panel_init_close) {
            if (!isStoryOperationCurrent(state, operationToken)) {
              return;
            }
            await dashboard.exec("hide");
          } else {
            if (!isStoryOperationCurrent(state, operationToken)) {
              return;
            }
            await dashboard.exec("show");
          }
          break;
        }
    }

    /**
     * Auto destroy e.g. if empty
     */
    dashboard.autoDestroy();
  }

  /**
   * Set legend panel behaviour
   */
  const lDefault = "default";
  const lClosed = "closed";
  const lRoot = path(settings, "legends_panel_behaviour", null);
  const lStep = path(step, "legends_panel_behaviour", null);
  let lBehaviour;

  if (settingsMapx.initClosedPanels) {
    lBehaviour = lClosed;
  } else if (lRoot && lRoot !== lDefault) {
    lBehaviour = lRoot;
  } else if (lStep && lStep !== lDefault) {
    lBehaviour = lStep;
  } else {
    lBehaviour = lDefault;
  }

  switch (lBehaviour) {
    case "open":
      state.button_legend.open();
      break;
    case "closed":
      state.button_legend.close();
      break;
    default:
      null;
  }
}

export function hasFocusOnMap() {
  const state = getState();
  let elActive = document.activeElement;
  const elMapC = state.elMapContainer;
  if (elActive === elMapC) {
    return true;
  }
  if (elActive.classList.contains("form-control")) {
    return false;
  }
  while (elActive) {
    elActive = elActive.parentElement;
    if (elActive === elMapC) {
      return true;
    }
  }
  return false;
}
