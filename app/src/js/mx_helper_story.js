import {initEditing} from './mx_helper_story_editor.js';
import {ButtonPanel} from './button_panel/index.js';
/**
 * Story map prototype
 * TODO:
 * - Convert this as a class / module
 * - Remove dependency on scrollTop and other things that trigger reflow/repaint
 * - Use css transition for step animation instead of scrollFromTo
 * - If scroll is still needed, use wheel event deltaY
 * - Use transform translateY on the story element
 */

/**
 * Store local and views
 */
const viewsAdditional = [];

/**
 * Default settings
 */
const settings = {
  ctrl_btn_disable: [
    'btn_overlap_spotlight',
    'btn_map_composer',
    'btn_geolocate_user',
    'btn_overlap_spotlight',
    'btn_map_composer'
  ],
  ctrl_btn_enable: ['btn_story_close', 'btn_story_unlock_map'],
  ctrl_btn_enable_update_mode: ['btn_story_unlock_map'],
  ctrl_btn_lock: 'btn_story_unlock_map',
  ctrl_btn_close: 'btn_story_close',
  ctrl_btn_3d_terrain: 'btn_3d_terrain',
  ctrl_btn_theme_sat: 'btn_theme_sat',
  panel_enable: [],
  panel_disable: ['main_panel', 'notif_center'],
  id_story: ['#story']
};

/**
 * Read and evaluate story map
 * @param {Object} o o.options
 * @param {String} o.id Map id
 * @param {String} o.idView View id. If no view is given, fetch one by id
 * @param {Object} o.view A view object containing a story in data
 * @param {Boolean} o.edit Enable editing
 * @param {Boolean} o.update Update : partial cleaning
 * @param {Boolean} o.storyAutoStart Bypass everything, start story, don't display back button
 * @param
 */
export function storyRead(o) {
  if (o.close) {
    return storyClose();
  }
  return getStory(o)
    .then(cleanInit)
    .then(setLocalViews)
    .then(setUi)
    .then(setListeners)
    .catch((e) => {
      console.error(e);
    });
}

/**
 * Check if a story is playing
 */
export function isStoryPlaying() {
  const h = mx.helpers;
  const s = h.path(mx, 'data.story', {});
  return s.enable === true;
}

/**
 * Close current story if any.
 */
export function storyClose() {
  const h = mx.helpers;
  const oldData = h.path(mx.data, 'story.data');
  if (oldData && oldData.close instanceof Function) {
    return oldData.close({enable: false, update: false});
  }
}

/**
 * Get story view or fetch it remotely
 */
async function getStory(o) {
  const h = mx.helpers;
  let view = h.getView(o.view || o.idView);
  if (!h.isView(view)) {
    view = await h.getViewRemote(o.idView);
  }
  if (h.isStory(view)) {
    o.view = view;
    o.idView = view.id;
  } else {
    throw new Error('No story to read');
  }
  return o;
}

/**
 * Clean + init
 */
async function cleanInit(o) {
  const h = mx.helpers;
  /**
   * Remove old listener
   */
  mx.listeners.removeListenerByGroup('story_map');

  /** Remove old stuff if any */
  const oldData = h.path(mx.data, 'story.data');
  if (oldData) {
    o.startScroll = oldData.elScroll.scrollTop;
  }
  if (oldData && h.isFunction(oldData.close)) {
    oldData.close({enable: false, update: false});
  }
  o.enable = true;

  return o;
}

async function cleanRemoveViews() {
  const h = mx.helpers;
  const map = h.getMap();
  const views = h.getViews();
  const vVisible = h.getViewsLayersVisibles();

  map.stop();

  for (let idView of vVisible) {
    await h.viewLayersRemove({
      idView: idView
    });
    await h.viewModulesRemove(idView);
  }

  while (viewsAdditional.length) {
    const view = viewsAdditional.pop();
    const pos = views.indexOf(view);
    if (pos > -1) {
      views.splice(pos, 1);
    }
  }
  return true;
}

/**
 * Evaluate missing view and fetch them if needed
 */
async function setLocalViews(o) {
  const h = mx.helpers;
  const view = o.view;
  const story = h.path(view, 'data.story', {});
  const idViewsStory = [];
  const idViewsToAdd = [];
  const viewsBase = h.getViews();
  const idViewsBase = viewsBase.map((v) => v.id);

  /**
   * Case views are stored within data.views (deprecated)
   */
  h.path(view, 'data.views', []).forEach((id) => {
    idViewsStory.push(id);
  });

  /**
   * Case when views are stored as object instead of id (deprecated).
   */
  if (h.isArrayOfViews(idViewsStory)) {
    idViewsStory.forEach((v, i) => idViewsStory.splice(i, 1, v.id));
  }

  /**
   * Case when views are not stored in data.view but only in steps (current behaviour).
   */
  idViewsStory.push(...getStoryViewsId(story));

  /**
   * Test for views id
   */
  if (idViewsStory.length && !h.isArrayOfViewsId(idViewsStory)) {
    throw new Error('Invalid story views list : not views id');
  }

  /**
   * Create a list of views id to download
   * ( e.g. if they are from another project )
   */
  idViewsToAdd.push(
    ...idViewsStory.filter((id) => {
      return idViewsBase.indexOf(id) === -1;
    })
  );

  /**
   * Return views to be fetched remotely
   */
  const idViewsToAddDistinct = h.getArrayDistinct(idViewsToAdd);

  /**
   * Fetch additional views
   */
  viewsAdditional.push(...(await h.getViewsRemote(idViewsToAddDistinct)));

  /**
   * addExternal views to views base
   */
  viewsBase.push(...viewsAdditional);

  return o;
}

/**
 * Add controller and build UI
 */
function setUi(o) {
  return new Promise(function(resolve) {
    /* display story controls */
    mx.helpers.storyController(o);

    /* Save data object */
    mx.data.story = o;

    /* Generate story ui */
    mx.helpers.storyBuild(o);

    /* Alter wrapper class */
    o.data.classWrapper =
      mx.helpers.path(o.view, 'data.story.settings.class_wrapper') ||
      'mx-story-screen-720p';

    if (o.data.classWrapper) {
      initAdaptiveScreen(o);
    }

    /* Return options */
    resolve(o);
  });
}

/**
 * Add listeners : scroll, key, adaptive screen
 */

async function setListeners(o) {
  /**
   * Handle key events
   */
  if (!o.edit) {
    initKeydownListener(o);
    initMouseMoveListener(o);
  } else {
    initEditing(o);
  }

  /**
   * Init bullet container and listener
   */
  initButtonsListener(o);

  /* Listen to scroll on the main container. */
  storyOnScroll({
    selector: '.mx-story',
    callback: storyUpdateSlides,
    view: o.view,
    data: o.data,
    enableCheck: function() {
      return o.enable;
    },
    startPos: o.startScroll
  });

  /* Set lock map pan to current value */
  storyControlMapPan('recalc');

  /* Return options */
  return o;
}

/**
* Init listener for keydown event on window
# @param {Object} o Story options
*/
function initKeydownListener() {
  mx.listeners.addListener({
    target: window,
    type: 'keydown',
    callback: storyHandleKeyDown,
    group: 'story_map'
  });
}

/**
* Init listener for mousemove event on window
# @param {Object} o Story options
*/
function initMouseMoveListener(o) {
  mx.helpers.onNextFrame(function() {
    var timer;
    var destroyed = false;
    var elBody = document.body;
    var elsCtrls = elBody.querySelectorAll(`
      .mx-story-step-bullets,
      .mapboxgl-ctrl-bottom-left,
      .mapboxgl-ctrl-bottom-right,
      .mapboxgl-ctrl-top-right,
      .button-panel--main
      `);
    //.button-panel--main : hidden or displayed by user choice

    var classOpacitySmooth = 'mx-smooth-opacity';
    var classNoCursor = 'nocursor';

    elsCtrls.forEach(function(el) {
      el.classList.add(classOpacitySmooth);
    });

    mx.listeners.addListener({
      target: window,
      callback: mouseHider,
      type: 'mousemove',
      group: 'story_map',
      onRemove: destroy
    });

    function mouseHider() {
      if (timer) {
        clearTimeout(timer);
      }
      show();
      timer = setTimeout(function() {
        if (!destroyed) {
          hide();
        }
      }, 2000);
    }

    function hide() {
      mx.helpers.onNextFrame(function() {
        elsCtrls.forEach(function(el) {
          el.style.opacity = 0.2;
        });
        elBody.classList.add(classNoCursor);
      });
    }

    function show() {
      mx.helpers.onNextFrame(function() {
        elsCtrls.forEach(function(el) {
          el.style.opacity = 1;
        });
        elBody.classList.remove(classNoCursor);
      });
    }

    function clean() {
      elsCtrls.forEach(function(el) {
        el.style.opacity = 1;
        el.classList.remove(classOpacitySmooth);
      });
    }

    function destroy() {
      destroyed = true;
      show();
      clean();
    }
  });
  return o;
}

/**
 * Init values for screen adaptiveness/scaling function
 * @param {Object} o story options
 */
function initAdaptiveScreen(o) {
  var data = o.data || {};
  data.elStory = document.querySelector('.' + o.classContainer);
  data.elMap = data.map.getContainer();
  data.elMapControls = data.elMap.querySelector('.mapboxgl-control-container');
  data.elStory.classList.add(data.classWrapper);
  data.rectStory = data.elStory.getBoundingClientRect();
  data.classMap = data.elMap.className;
  data.styleMap = data.elMap.style;

  data.elMap.classList.add(o.classContainer);
  data.elMap.classList.add(data.classWrapper);

  data.setWrapperLayout = function() {
    var scaleWrapper = Math.min(
      window.innerWidth / data.rectStory.width,
      window.innerHeight / data.rectStory.height
    );
    data.scaleWrapper = scaleWrapper;
    data.elStory.style[mx.helpers.cssTransform] =
      'translate(-50%,-50%) scale(' + scaleWrapper + ')';
    data.elStory.style[mx.helpers.cssTransform] =
      'translate(-50%,-50%) scale(' + scaleWrapper + ')';
    data.elMap.style.height = data.rectStory.height * scaleWrapper + 'px';
    data.elMap.style.width = data.rectStory.width * scaleWrapper + 'px';
    data.elMap.style[mx.helpers.cssTransform] = 'translate(-50%,-50%)';
    data.map.resize();
  };
}

function getStoryViewsId(story) {
  const h = mx.helpers;
  const idViewsStory = [];

  story.steps.forEach((step) => {
    if (step && h.isArray(step.views)) {
      step.views.forEach((d) => {
        if (h.isObject(d)) {
          idViewsStory.push(d.view);
        }
      });
    } else {
      return;
    }
  });
  return idViewsStory;
}

/**
 * Set scroll data values
 * @param {Object} o Options
 * @param {Object} o.scrollData Scroll data to update
 * @param {String} o.selector Selector of the scrollable
 */
function setScrollData(o) {
  var data = o.onScrollData;
  var elScroll = document.querySelector(o.selector);
  var rectElScroll = elScroll.getBoundingClientRect();

  if (o.startPos) {
    elScroll.scrollTop = o.startPos;
    o.startPos = null;
  }
  o.data.elScroll = elScroll;
  data.scaleWrapper = o.data.scaleWrapper;
  data.elScroll = elScroll;
  data.rectElScroll = rectElScroll;
  data.height = rectElScroll.height;
  data.trigger = rectElScroll.height * 0.5;
  data.distTop = -1;
  data.scrollFun = mx.helpers.cssTransform;
}

/**
 * On scroll, do something
 * @param {Object} o Options
 * @param {String|Element} o.selector
 * @param {Function} o.callback Callback function. All options will be provided to this callback function
 */
function storyOnScroll(o) {
  var data, posNow, posLast;
  var nf = mx.helpers.onNextFrame;
  /*
   * Store start values
   */
  o.onScrollData = {};

  /*
   * Start loop
   */
  updateLayout();
  loop();
  /**
   * Trigger step config
   */
  mx.listeners.addListener({
    target: window,
    type: 'resize',
    callback: updateLayout,
    group: 'story_map'
  });

  function updateLayout() {
    o.data.setWrapperLayout(o);
    setScrollData(o);
    setStepConfig(o);
  }

  /*
   * Loop : run a function if scroll is done on an element
   */
  function loop() {
    if (o.enableCheck()) {
      data = o.onScrollData;
      // NOTE: scrollTop does not reflect actual dimension but non scaled ones.
      posNow = data.elScroll.scrollTop * data.scaleWrapper || 1;
      posLast = data.distTop;
      if (posLast === posNow) {
        nf(loop);
        return false;
      } else {
        o.onScrollData.distTop = posNow;
      }
      o.callback(o);
      nf(loop);
    }
  }
}

function initButtonsListener(o) {
  const h = mx.helpers;

  /**
   * Button Legend
   */
  o.data.buttonLegend = new ButtonPanel({
    //elContainer: o.data.elMapContainer,
    elContainer: document.body,
    panelFull: true,
    position: 'bottom-left',
    tooltip_position: 'right',
    button_text: h.getDictItem('button_legend_button'),
    button_lang_key: 'button_legend_button',
    button_classes: ['fa', 'fa-list-ul'],
    container_classes: ['button-panel--container-no-full-width'],
    container_style: {
      width: '300px',
      height: '300px',
      minWidth: '200px',
      minHeight: '200px',
      maxWidth: '50vw'
    }
  });

  /**
   * Control panel buttons
   */
  o.data.ctrlMode3d = mx.panel_tools.controls.getButton('btn_3d_terrain');
  o.data.ctrlAerial = mx.panel_tools.controls.getButton('btn_theme_sat');

  /**
   * Bullets
   */
  let elBullets;
  const elBulletsContainer = h.el(
    'div',
    {
      class: ['mx-story-step-bullets-container', 'noselect']
    },
    (elBullets = h.el('div', {class: ['mx-story-step-bullets', 'noselect']}))
  );

  o.data.elBullets = elBullets;
  o.data.elBulletsContainer = elBulletsContainer;
  o.data.elMapControls.appendChild(elBulletsContainer);

  /**
   * When click, scroll to step
   */
  mx.listeners.addListener({
    target: elBullets,
    type: 'click',
    callback: bulletScrollTo,
    group: 'story_map'
  });

  /*
   * Set position
   */
  function bulletScrollTo(e) {
    const step = e.target.dataset.step;
    if (step) {
      e.stopPropagation();
      h.storyGoTo(step);
    }
  }
}

/**
 * Set step config : dimention, number, bullets
 */
function setStepConfig(o) {
  const h = mx.helpers;
  const el = h.el;

  var data = o.onScrollData;
  var elBullets, elBullet, config, rect, elStep, elSteps, elSlides, stepName;
  var slideConfig;

  /*
   * Steps configuration
   */
  data.stepsConfig = [];
  elBullets = o.data.elBullets;
  elSteps = data.elScroll.querySelectorAll('.mx-story-step');

  /**
   * Clean bullets
   */
  elBullets.innerHTML = '';

  for (var s = 0, sL = elSteps.length; s < sL; s++) {
    /*
     * config init
     */
    config = {};
    elStep = elSteps[s];
    stepName = elStep.dataset.step_name;
    rect = elStep.getBoundingClientRect();
    elSlides = elStep.querySelectorAll('.mx-story-slide');
    config.elStep = elStep;
    config.elSlides = elSlides;
    config.slidesConfig = [];

    /*
     * Save step dimensions
     */
    config.end = (s + 1) * rect.height;
    config.start = config.end - rect.height;
    config.startUnscaled = config.start * (1 / data.scaleWrapper);
    config.height = rect.height;
    config.width = rect.width;

    /*
     * Bullets init
     */
    elBullet = el(
      'div',
      {
        class: ['mx-story-step-bullet', 'shadow', 'mx-pointer', 'hint--top'],
        'aria-label': stepName ? stepName : 'Step ' + (s + 1),
        dataset: {
          to: config.startUnscaled,
          step: s
        }
      },
      s + 1 + ''
    );

    elBullets.appendChild(elBullet);
    config.elBullet = elBullet;

    if (s === 0) {
      elBullet.classList.add('mx-story-step-active');
    }

    /*
     * Evaluate slides and save in config
     */
    for (var l = 0; l < elSlides.length; l++) {
      slideConfig = [];
      try {
        slideConfig = elSlides[l].dataset.slide_config;
        if (h.isJson(slideConfig)) {
          slideConfig = JSON.parse(slideConfig || '[]');
        }
        if (!h.isArray(slideConfig)) {
          slideConfig = [];
        }
      } catch (e) {
        console.error(e, slideConfig);
      }
      config.slidesConfig.push(slideConfig);
    }

    data.stepsConfig.push(config);
  }

  /*
   * Save steps config
   */
  o.data.stepsConfig = data.stepsConfig;

  /**
   * Set initial scroll position
   */
  if (o.onScrollData.distStart) {
    data.elScroll.scrollTop = o.onScrollData.distStart * 1;
  }
}

/*
 * Update slides transform value;
 * @param {Object} o options
 * @param {Object} o.onScrollData Data from onScroll function
 * @param {Object} o.view View object
 */
export function storyUpdateSlides(o) {
  /*
   * Apply style
   */
  var data = o.onScrollData;
  var percent = 0;
  var elSlides;
  var elStep;
  var elBullet;
  var elBullets = o.data.elBullets;
  var isActive, isInRange, isInRangeAnim, toActivate;
  var clHidden = 'mx-visibility-hidden';
  var clRemove = 'mx-display-none';
  var isHidden = false;
  if (!o.enableCheck()) {
    return;
  }

  //for (var s = 0, sL = data.stepsConfig.length; s < sL; s++) {
  data.stepsConfig.forEach((config, s) => {
    /**
     *   1       2       s       e       5       6
     *   |.......|.......|.......|.......|.......|
     *                t|.......|b
     */
    config = data.stepsConfig[s];
    percent = ((config.end - data.distTop) / (config.height * 2)) * 100;

    isInRange = percent < 75 && percent >= 25;
    isInRangeAnim = percent < 100 && percent >= 0;
    isActive = data.stepActive === s;
    toActivate = isInRange && !isActive;
    isHidden = config.elStep.classList.contains(clHidden);
    elStep = config.elStep;
    elSlides = config.elSlides;
    /**
     * Update slide animation
     */
    if (isInRangeAnim) {
      if (isHidden) {
        elStep.classList.remove(clHidden);
      }
      elSlides.forEach((elSlide, i) => {
        var slideTransform = mx.helpers.storySetTransform({
          data: config.slidesConfig[i],
          percent: percent
        });
        elSlide.classList.remove(clRemove);
        elSlide.style[data.scrollFun] = slideTransform;
      });
    } else {
      if (!isHidden) {
        elStep.classList.add(clHidden);
        elSlides.forEach((elSlide) => {
          elSlide.classList.add(clRemove);
        });
      }
    }

    /**
     * Play step
     */
    if (toActivate) {
      mx.helpers.storyPlayStep({
        id: 'map_main',
        view: o.view,
        stepNum: s,
        elLegendContainer: o.data.buttonLegend.elPanelContent
      });
      data.stepActive = s;

      /**
       * Update bullet values
       */
      const nStep = data.stepsConfig.length;

      for (var b = 0; b < nStep; b++) {
        elBullet = data.stepsConfig[b].elBullet;
        if (b <= s) {
          elBullet.classList.add('mx-story-step-active');
        } else {
          elBullet.classList.remove('mx-story-step-active');
        }
      }
      /**
       * Update bullet container center
       */
      const bContWidth = elBullets.getBoundingClientRect().width;
      const bItemWidth = bContWidth / nStep;
      const dist = bContWidth / 2 - (s + 1) * bItemWidth;
      elBullets.style.transform = `translateX(${dist}px)`;
    }
  });
}

/*
 * listen for keydown
 */
async function storyHandleKeyDown(event) {
  event.preventDefault();
  event.stopPropagation();
  var h = mx.helpers;

  switch (event.key) {
    case 'Escape':
      const close = h.path(mx, 'data.story.data.close');
      if (h.isFunction(close)) {
        close();
      }
      break;
    case ' ':
      await h.storyAutoPlay('start');
      break;
    case 'ArrowDown':
    case 'ArrowRight':
      await h.storyAutoPlay('stop');
      await h.storyGoTo('next');
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      await h.storyAutoPlay('stop');
      await h.storyGoTo('previous');
      break;
    default:
      if (h.isNumeric(event.key)) {
        await h.storyGoTo(event.key * 1 - 1);
      }
      return;
  }
}

let storyGoToDone = true;
export async function storyGoTo(to, useTimeout, funStop) {
  const h = mx.helpers;
  var story = h.path(mx, 'data.story');
  if (!story || !story.data || !story.data.stepsConfig) {
    return;
  }
  var steps = h.path(story, 'view.data.story.steps', []);
  var stepsDim = h.path(story, 'data.stepsConfig');
  var elStory = story.data.elScroll;
  var height = h.path(story, 'data.rectStory.height');
  var start = elStory.scrollTop;
  var stop = 0;
  var timeout = 0;
  var currentStep = h.path(story, 'data.currentStep') || 0;
  var step,
    maxStep,
    nextStep,
    previousStep,
    destStep,
    duration,
    easing,
    easing_p;

  maxStep = steps.length - 1;

  switch (to) {
    case 'next':
    case 'n':
      nextStep = currentStep + 1;
      destStep = nextStep > maxStep ? 0 : nextStep;
      break;
    case 'previous':
    case 'p':
      previousStep = currentStep - 1;
      destStep = previousStep < 0 ? maxStep : previousStep;
      break;
    default:
      if (h.isNumeric(to)) {
        destStep = to >= maxStep ? maxStep : to < 0 ? 0 : to;
      }
  }

  stop = stepsDim[destStep].startUnscaled;
  step = steps[currentStep];

  easing = h.path(step, 'autoplay.easing') || 'easeIn';
  duration = h.path(step, 'autoplay.duration') || 1000;
  easing_p = h.path(step, 'autoplay.easing_power') || 1;

  //story.data.currentStep = destStep;

  if (useTimeout) {
    timeout = h.path(step, 'autoplay.timeout') || 1000;
  }

  const easeFun = h.easingFun({
    type: easing,
    power: easing_p
  });

  const jump = storyGoToDone === false || Math.abs(stop - start) > height;

  storyGoToDone = false;

  const promScroll = h.scrollFromTo({
    emergencyStop: funStop,
    timeout: timeout,
    el: elStory,
    from: start,
    to: stop,
    jump: jump,
    during: duration,
    using: easeFun
  });

  await maxWait(promScroll, duration + timeout);

  storyGoToDone = true;

  return {
    step: destStep,
    end: destStep === maxStep
  };
}

/**
 * Prmise race
 */

function maxWait(prom, duration) {
  return Promise.race([
    prom,
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, duration);
    })
  ]);
}

let n = 0;
export async function storyAutoPlay(cmd) {
  const h = mx.helpers;

  var data = h.path(mx.data, 'story.data', {});
  var enabled = data.autoplay || false;
  var playStart = cmd === 'start' && !enabled;
  var playStop = (cmd === 'stop' && enabled) || (cmd === 'start' && enabled);
  var playNext = cmd === 'next' && enabled;

  var stopControl = function() {
    return data.autoplay === false;
  };

  if (playStart) {
    h.iconFlash('play');
    data.autoplay = true;
    storyAutoPlay('next');
  }

  if (playStop) {
    data.autoplay = false;
    h.iconFlash('stop');
  }

  if (playNext) {
    await h.storyGoTo('next', true, stopControl);
    if (data.autoplay) {
      storyAutoPlay('next');
    }
  }
  return data.autoplay;
}

/**
 * Control map pan during story map
 * @param {String} cmd Action : recalc, unlock, toggle;
 */
export function storyControlMapPan(cmd) {
  const valid = ['recalc', 'lock', 'unlock', 'toggle'].indexOf(cmd) > -1;

  if (!valid) {
    cmd = 'toggle';
  }
  const keyBtnUnlock = settings.ctrl_btn_lock;
  const btn = mx.panel_tools.controls.getButton(keyBtnUnlock);
  const elButton = btn.elButton;
  const elIcon = elButton.querySelector('.fa');
  const elStory = document.getElementById('story');
  const classLock = 'fa-lock';
  const classUnlock = 'fa-unlock';
  const classNoEvent = 'mx-events-off';
  const isLocked = elIcon.classList.contains(classLock);
  const isUnlocked = !isLocked;
  const isRecalc = cmd === 'recalc';

  const cases = {
    unlock: true,
    lock: false,
    recalc: !isLocked,
    toggle: isLocked
  };

  const toUnlock = cases[cmd];
  const hasChanged = toUnlock !== isUnlocked;

  if (toUnlock) {
    elIcon.classList.remove(classLock);
    elIcon.classList.add(classUnlock);
    elStory.classList.add(classNoEvent);
    if (!isRecalc && hasChanged) {
      mx.helpers.iconFlash('unlock');
    }
  } else {
    elIcon.classList.add(classLock);
    elIcon.classList.remove(classUnlock);
    elStory.classList.remove(classNoEvent);
    if (!isRecalc && hasChanged) {
      mx.helpers.iconFlash('lock');
    }
    if (mx.dashboard && mx.dashboard.panel) {
      mx.dashboard.panel.close(true);
    }
  }
}

/*
 * Enable or disable story map controls
 * @param {Object} o options
 * @param {Object} o.data Story props and cache
 * @param {Boolean} o.enable Enable / start story
 */
export function storyController(o) {
  o.id = o.id || 'map_main';

  const h = mx.helpers;
  const ctrls = mx.panel_tools.controls;
  const enableMode = o.enable === true || o.update === true;
  const quitMode = o.enable === false;
  const updateMode = o.update === true;
  const autoStart = o.autoStart === true;
  const keyBtnShow =
    autoStart || updateMode
      ? settings.ctrl_btn_enable_update_mode
      : settings.ctrl_btn_enable;
  const keyBtnHide = settings.ctrl_btn_disable;
  const panelDisable = settings.panel_disable;

  for (let key of enableMode ? keyBtnShow : keyBtnHide) {
    const btn = ctrls.getButton(key);
    btn.show();
  }
  for (let key of enableMode ? keyBtnHide : keyBtnShow) {
    const btn = ctrls.getButton(key);
    btn.hide();
  }
  for (let panel of window._button_panels) {
    for (let key of panelDisable) {
      if (panel.opt.id === key) {
        panel[enableMode ? 'hide' : 'show']();
      }
    }
  }

  const keyBtn3d = settings.ctrl_btn_3d_terrain;
  const keyBtnSat = settings.ctrl_btn_theme_sat;

  const btn3d = ctrls.getButton(keyBtn3d);
  const btnSat = ctrls.getButton(keyBtnSat);

  const elBtnPreview = document.querySelector('#btnViewPreviewStory');
  /**
   * elBtnPreview always enabled
   */
  if (elBtnPreview) {
    elBtnPreview.removeAttribute('disabled');
  }
  /**
   * Enable story
   */
  if (enableMode) {
    /**
     *Check for previews views list ( in case of update );
     */
    var oldViews = h.path(mx.data, 'story.data.views');
    if (!h.isArrayOfViewsId(oldViews)) {
      oldViews = h.getViewsLayersVisibles();
    }

    /* Save current values */
    o.data = {
      enabled: true,
      map: h.getMap(),
      views: oldViews,
      setWrapperLayout: function() {},
      position: h.getMapPos(o),
      currentStep: 0,
      hasAerial: btnSat.action('hide'),
      has3d: btn3d.action('hide'),
      listeners: [],
      autoplayStop: true
    };

    /**
     * Remove non stop map views
     */
    for (let id of oldViews) {
      h.viewRemove(id);
    }

    /**
     * Create a callback for when the story is closed
     */
    o.data.close = function(cmd) {
      o.enable = false;
      o = Object.assign(o, cmd);
      storyController(o);
    };
  }

  /**
   * Stop story and clean up
   */
  if (quitMode) {
    /**
     * Lock story
     */
    h.storyControlMapPan('lock');

    /**
     * Remvove registered listener
     */
    mx.listeners.removeListenerByGroup('story_map');

    /**
     * Remove layers added by the story
     */
    cleanRemoveViews();

    /**
     * Get previous stored data
     */

    if (o.data) {
      /**
       * Set the story as disabled
       */
      o.data.enabled = false;

      /**
       * if edit mode, remove editor
       */
      if (o.data.ct_editor && o.data.ct_editor.remove) {
        o.data.ct_editor.remove();
      }

      /**
       *
       */
      if (!updateMode) {
        if (o.data.hasAerial) {
          btnSat.action('show');
        } else {
          btnSat.action('hide');
        }
        if (o.data.has3d) {
          btn3d.action('show');
        } else {
          btn3d.action('hide');
        }

        /**
         * Re-add previously enabled views
         */
        for (let id of o.data.views) {
          h.viewAdd(id);
        }
      }

      /**
       * Rest previous position
       */
      if (!updateMode && o.data.position) {
        const pos = o.data.position;
        o.data.map.jumpTo({
          zoom: pos.z,
          bearing: pos.b,
          pitch: pos.p,
          center: [pos.lng, pos.lat]
        });
      }

      if (o.data.elBullets) {
        o.data.elBullets.remove();
      } else {
        console.log('no bullets');
      }
      if (o.data.elBulletsContainer) {
        o.data.elBulletsContainer.remove();
      } else {
        console.log('no bullets container');
      }

      if (o.data.elScroll) {
        o.data.elScroll.remove();
      }

      if (o.data.elStory) {
        o.data.elStory.remove();
      }
      if (o.data.buttonLegend) {
        o.data.buttonLegend.destroy();
      }
      if (o.data.styleMap) {
        o.data.elMap.style = o.data.styleMap;
      }
      if (o.data.classMap) {
        o.data.elMap.className = o.data.classMap;
      }

      /**
       * Resize map
       */

      if (!updateMode) {
        o.data.map.resize();
      }
      /**
       * clean data storage
       */
      if (mx.data.story) {
        mx.data.story = {};
      }
    }
  }
}

/**
 * Build story ui
 *
 *
 */
export function storyBuild(o) {
  const h = mx.helpers;
  const path = h.path;
  const el = h.el;
  const glfo = h.getLabelFromObjectPath;
  const story = path(o, 'view.data.story');

  if (!story || !story.steps || story.steps.length < 1) {
    return;
  }

  /**
   * Set default
   */
  o.idStory = o.idStory || 'story';
  o.classStory = o.classStory || 'mx-story';
  o.classStep = o.classStep || 'mx-story-step';
  o.classSlide = o.classSlide || 'mx-story-slide';
  o.classSlideBack = o.classSlideBack || 'mx-story-slide-back';
  o.classSlideFront = o.classSlideFront || 'mx-story-slide-front';
  o.classContainer = o.classContainer || 'mx-story-layout';
  o.colors = o.colors || {};
  o.sizes = o.sizes || {};
  o.sizes.text = o.sizes.text || 40;
  o.colors.bg = o.colors.bg || '#FFF';
  o.colors.fg = o.colors.fg || '#000';
  o.colors.alpha = o.colors.alpha || 1;

  o.data.elMapContainer = o.data.map.getContainer();

  /**
   * Story map container
   */
  o.data.elStoryContainer = el(
    'div',
    {
      class: o.classContainer,
      id: o.idStory
    },
    el(
      'div',
      {
        class: o.classStory
      },
      story.steps.map((step, stepNum) => {
        /**
         * For each step
         */
        return el(
          'div',
          {
            class: o.classStep,
            dataset: {
              step_name: step.name
            }
          },
          step.slides.map((slide, slideNum) => {
            var config = JSON.stringify(slide.effects || []);
            /**
             * For each slide
             */
            return el(
              'div',
              {
                dataset: {
                  slide_config: config
                },
                class: [o.classSlide].concat(
                  slide.classes.map((c) => o.classStory + '-' + c.name),
                  'mx-display-none'
                )
              },
              el(
                'div',
                {
                  class: o.classSlideFront,
                  style: {
                    color: slide.color_fg || o.colors.fg,
                    borderColor: slide.color_fg || o.colors.fg,
                    fontSize: slide.size_text + 'px' || o.sizes.text + 'px',
                    overflowY: slide.scroll_enable ? 'scroll' : 'hidden'
                  },
                  dataset: {
                    editable: true,
                    name: stepNum + ':' + slideNum
                  }
                },
                glfo({
                  obj: slide,
                  path: 'html',
                  default: '<p></p>'
                })
              ),
              el('div', {
                style: {
                  backgroundColor: slide.color_bg || o.colors.bg,
                  opacity:
                    slide.opacity_bg === 0
                      ? 0
                      : slide.opacity_bg || o.colors.alpha
                },
                class: o.classSlideBack
              })
            );
          }) // end slides
        );
      }) // end steps
    )
  );

  /**
   * Add story map to map container
   */
  o.data.elMapContainer.appendChild(o.data.elStoryContainer);

  /**
   * Handle broken images
   */
  var imgs = o.data.elStoryContainer.querySelectorAll('img');
  imgs.forEach((img) => {
    img.onerror = function() {
      var imgRect = img.getBoundingClientRect();
      var w = Math.ceil(imgRect.width);
      var h = Math.ceil(imgRect.height);
      var elCanvas = mx.helpers.createCanvas(w, h);
      var elParent = img.parentElement;
      elParent.appendChild(elCanvas);
      img.remove();
    };
  });
}

/*
 * Set slide style translate based on dataset
 * @param {Object} o option
 * @param {Array} o.data Style config array
 * @param {Number} o.percent Percent of anim
 */
export function storySetTransform(o) {
  var tf = {
    0: function() {
      return '';
    },
    1: function(p) {
      return 'translate3d(' + p + '%,0,0)';
    },
    2: function(p) {
      return 'translate3d(0,' + p + '%,0)';
    },
    3: function(p) {
      return 'translate3d(0,0,' + p + 'px)';
    },
    4: function(p) {
      p = p * 3.6;
      return 'rotate3d(1,0,0,' + p + 'deg)';
    },
    5: function(p) {
      p = p * 3.6;
      return 'rotate3d(0,1,0,' + p + 'deg)';
    },
    6: function(p) {
      p = p * 3.6;
      return 'rotate3d(0,0,1,' + p + 'deg)';
    },
    7: function(p) {
      p = p / 100 + 1;
      return 'scale(' + p + ')';
    }
  };
  /* all transformations */
  var tt = [];
  /* Reverse percentage : start at 0, finish at 100 */
  var p = 100 - o.percent;

  for (var i = 0; i < o.data.length; i++) {
    var d = o.data[i];

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

  return tt.join(' ');
}

export function storyPlayStep(o) {
  o = o || {};
  o.id = o.id || 'map_main';
  const h = mx.helpers;
  const steps = h.path(o, 'view.data.story.steps', []);
  const data = h.path(mx.data, 'story.data', {});
  const elLegendContainer = o.elLegendContainer;
  const stepNum = o.stepNum;
  const m = h.getMapData();
  if (steps.length === 0) {
    return;
  }
  mx.events.fire('story_step');
  data.currentStep = stepNum;

  /**
   * retrieve step information
   */
  const step = steps[stepNum];
  const pos = step.position;
  const anim = step.animation || {
    duration: 1000,
    easing: 'easeIn',
    easing_power: 1,
    method: 'easeTo'
  };
  const easing = h.easingFun({type: anim.easing, power: anim.easing_power});

  /**
   * Set base map mode
   */
  if (step.base_layer) {
    if (step.base_layer.add_aerial) {
      data.ctrlAerial.action('show');
    } else {
      data.ctrlAerial.action('hide');
    }
    if (step.base_layer.add_3d_terrain) {
      data.ctrlMode3d.action('show');
    } else {
      data.ctrlMode3d.action('hide');
    }
  }

  /**
   * Fly to position
   */
  if (anim.method === 'fitBounds') {
    if (pos.s && pos.n && pos.e && pos.w) {
      m.map.fitBounds([pos.w, pos.s, pos.e, pos.n]);
      m.map.once('moveend', function() {
        m.map.easeTo({pitch: 0.0});
      });
    } else {
      throw new Error('Missing position to fitbounds');
    }
  } else {
    m.map[anim.method]({
      duration: anim.duration,
      zoom: pos.z,
      easing: easing,
      bearing: pos.bearing,
      pitch: pos.pitch,
      center: [pos.lng, pos.lat]
    });
  }

  /**
   * Views set
   */
  const vStep = step.views.map((v) => v.view);
  const vVisible = h.getViewsLayersVisibles();
  const vToRemove = h.getArrayDiff(vVisible, vStep);
  const vToAdd = h.getArrayDiff(vStep, vVisible);

  /**
   * Add view if not alredy there
   */
  const vPromAdded = vToAdd.map((v, i) => {
    const vPrevious = vStep[i - 1] || mx.settings.layerBefore;
    return h.viewLayersAdd({
      id: o.id,
      idView: v,
      openView: false,
      addTitle: true,
      before: vPrevious,
      elLegendContainer: elLegendContainer
    });
  });

  /**
   * Remove view not used
   */
  const vPromRemoved = vToRemove.map((v) => {
    return h.viewLayersRemove({
      id: o.id,
      idView: v,
      elLegendContainer: elLegendContainer
    });
    //h.viewModulesRemove(v);
  });

  /**
   * Once everything is done set order
   */
  Promise.all([...vPromAdded, ...vPromRemoved])
    .then(() => {
      return h.viewsLayersOrderUpdate({
        order: vStep,
        id: o.id
      });
    })
    .catch((e) => console.error);
}
