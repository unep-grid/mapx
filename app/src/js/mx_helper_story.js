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
 * Read and evaluate story map
 * @param {Object} o o.options
 * @param {String} o.id Map id
 * @param {String} o.idView View id. If no view is given, fetch one by id
 * @param {Object} o.view A view object containing a story in data
 * @param {Boolean} o.storyAutoStart Bypass everything, start story, don't display back button
 * @param
 */

export function storyRead(o) {
  return cleanInit(o)
    .then(checkMissingView)
    .then(setUi)
    .then(setListeners);
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

    /* Return options */
    resolve(o);
  });
}

/**
 * Add listeners : scroll, key, adaptive screen
 */

function setListeners(o) {
  return new Promise(function(resolve) {
    if (o.data.classWrapper) {
      initAdaptiveScreen(o);
    }

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
    initBulletsListener(o);

    /* Listen to scroll on the main container. */
    storyOnScroll({
      selector: '.mx-story',
      callback: mx.helpers.storyUpdateSlides,
      view: o.view,
      data: o.data,
      enable: o.enable,
      startPos: o.startScroll
    });

    /* Set lock map pan to current value */
    mx.helpers.storyControlMapPan({
      recalc: true
    });

    /* Return options */
    resolve(o);
  });
}

/**
* Init listener for keydown event on window
# @param {Object} o Story options
*/
function initKeydownListener() {
  mx.listenerStore.addListener({
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
    var elsCtrls = o.data.elMap.querySelectorAll(
      '.mx-story-step-bullets, .mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right, .mapboxgl-ctrl-top-left'
    );

    var classOpacitySmooth = 'mx-smooth-opacity';
    var classNoCursor = 'nocursor';

    elsCtrls.forEach(function(el) {
      el.classList.add(classOpacitySmooth);
    });

    mx.listenerStore.addListener({
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
          el.style.opacity = 0;
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
}

/**
 * Init values for screen adaptiveness/scaling function
 * @param {Object} o story options
 */
function initAdaptiveScreen(o) {
  //var classBase = "mx-story-screen";
  //var classWrapper = "mx-wrapper";
  o.data.elStory = document.querySelector('.' + o.classContainer);
  o.data.elMap = o.data.map.getContainer();
  o.data.elMapControls = o.data.elMap.querySelector(
    '.mapboxgl-control-container'
  );
  o.data.elStory.classList.add(o.data.classWrapper);
  o.data.rectStory = o.data.elStory.getBoundingClientRect();
  o.data.classMap = o.data.elMap.className;
  o.data.styleMap = o.data.elMap.style;

  o.data.elMap.classList.add(o.classContainer);
  o.data.elMap.classList.add(o.data.classWrapper);

  o.data.setWrapperLayout = function(o) {
    var scaleWrapper = Math.min(
      window.innerWidth / o.data.rectStory.width,
      window.innerHeight / o.data.rectStory.height
    );
    o.data.scaleWrapper = scaleWrapper;
    o.data.elStory.style[mx.helpers.cssTransform] =
      'translate(-50%,-50%) scale(' + scaleWrapper + ')';
    o.data.elStory.style[mx.helpers.cssTransform] =
      'translate(-50%,-50%) scale(' + scaleWrapper + ')';
    o.data.elMap.style.height = o.data.rectStory.height * scaleWrapper + 'px';
    o.data.elMap.style.width = o.data.rectStory.width * scaleWrapper + 'px';
    o.data.elMap.style[mx.helpers.cssTransform] = 'translate(-50%,-50%)';
    o.data.map.resize();
  };
}

var customStyle = [
  /* Table classes from bootstrap */
  {t: 'Table base', c: 'table', f: ['table']},
  {t: 'Table bordered', c: 'table-bordered', f: ['table']},
  {t: 'Table striped', c: 'table-striped', f: ['table']},
  {t: 'Table hover', c: 'table-hover', f: ['table']},
  /* custom mapx classes */
  {t: 'Image cover', c: 'mx-image-cover', f: ['img']},
  {t: 'Margin top 5%', c: 'margin-top-5p'},
  {t: 'Width 100%', c: 'width-100p'},
  {t: 'Margin right 5%', c: 'margin-right-5p'},
  {t: 'Margin left 5%', c: 'margin-left-5p'},
  {t: 'Margin bottom 5%', c: 'margin-bottom-5p'},
  {t: 'Margin top 10%', c: 'margin-top-10p'},
  {t: 'Margin right 10%', c: 'margin-right-10p'},
  {t: 'Margin left 10%', c: 'margin-left-10p'},
  {t: 'Margin bottom 10%', c: 'margin-bottom-10p'},
  {t: 'Align right', c: 'align-right'},
  {t: 'Align left', c: 'align-left'},
  {t: 'Center', c: 'block-center'},
  {t: 'Absolute top', c: 'absolute-top'},
  {t: 'Absolute left', c: 'absolute-left'},
  {t: 'Absolute right', c: 'absolute-right'},
  {t: 'Absolute bottom', c: 'absolute-bottom'},
  {t: 'Absolute 50% top', c: 'absolute-50-top'},
  {t: 'Absolute 50% left', c: 'absolute-50-left'},
  {t: 'Absolute 50% right', c: 'absolute-50-right'},
  {t: 'Absolute 50% bottom', c: 'absolute-50-bottom'}
];

/**
 * Init editing function
 * @param {Options} o story options
 */
function initEditing(o) {
  var ContentTools;

  return Promise.all([
    import('ContentTools'),
    import('ContentTools/build/content-tools.min.css')
  ])
    .then(function(m) {
      ContentTools = m[0].default;
      return import('./../coffee/mx_extend_content_tools.coffee');
    })
    .then(function() {
      /*
       * Get ContentTools and set upload logic
       */

      if (!ContentTools._init) {
        ContentTools.DEFAULT_TOOLS = [
          [
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'paragraph',
            'blockquote',
            'preformatted'
          ],
          ['italic', 'bold'],
          ['align-left', 'align-center', 'align-right'],
          [
            'unordered-list',
            'ordered-list',
            'table',
            'indent',
            'unindent',
            'line-break'
          ],
          ['link', 'image', 'video'],
          ['undo', 'redo', 'remove']
        ];

        var style = customStyle.map(function(s) {
          return new ContentTools.Style(s.t, s.c, s.f);
        });
        ContentTools.StylePalette.add(style);
        ContentTools.IMAGE_UPLOADER = contentToolsImageUploader;
        ContentTools._init = true;
      }
      /**
       * If not already set, create a new editor instance
       */
      if (!o.data.ct_editor) {
        o.data.ct_editor = ContentTools.EditorApp.get();

        /**
         * Add custom button logic
         */
        var elBtnModalPreview = document.getElementById('btnViewPreviewStory');
        var elBtnModalSave = document.getElementById('btnViewSaveStory');
        //var elBtnStoryClose = document.getElementById("btnViewStoryCancel");
        var elModalEditView = document.getElementById('modalViewEdit');
        /**
         * Set a remove function for custom buttons
         */

        o.data.ct_editor.remove = function() {
          o.data.ct_editor.destroy();
        };

        /**
         * Init editor
         */
        o.data.ct_editor.init(
          '*[data-editable]', // class of region editable
          'data-name', // name of regions
          null, // fixture test
          true
        );

        /**
         * On start
         */
        o.data.ct_editor.addEventListener('start', function() {
          elBtnModalSave.setAttribute('disabled', true);
          elBtnModalPreview.setAttribute('disabled', true);
          //elBtnStoryClose.setAttribute("disabled",true);
          elModalEditView.classList.add('mx-hide');
          /* If jed has an story editor, disable it during edition */
          if (jed.editors.storyEdit) {
            jed.editors.storyEdit.disable();
          }
        });

        /**
         * On cancel
         */
        o.data.ct_editor.addEventListener('revert', function() {
          elBtnModalSave.removeAttribute('disabled');
          elBtnModalPreview.removeAttribute('disabled');
          elModalEditView.classList.remove('mx-hide');
          //elBtnStoryClose.removeAttribute("disabled");
          if (jed.editors.storyEdit) {
            jed.editors.storyEdit.enable();
          }
        });

        /**
         * On save
         */
        o.data.ct_editor.addEventListener('saved', function(ev) {
          var regions;

          elBtnModalSave.removeAttribute('disabled');
          elBtnModalPreview.removeAttribute('disabled');
          //elBtnStoryClose.removeAttribute("disabled");
          elModalEditView.classList.remove('mx-hide');
          // Check that something changed
          regions = ev.detail().regions;
          if (jed.editors.storyEdit) {
            jed.editors.storyEdit.enable();
          }
          if (Object.keys(regions).length === 0) {
            return;
          }

          if (jed.editors.storyEdit) {
            var j = jed.editors.storyEdit;
            this.busy(true);

            for (var k in regions) {
              var t = regions[k];
              var s = k.split(':');
              var step = +s[0];
              var slide = +s[1];
              var lang = mx.settings.language;
              var e = j.getEditor(
                'root.steps.' + step + '.slides.' + slide + '.html.' + lang
              );
              if (e && e.setValue) {
                e.setValue(t);
              }
            }
            this.busy(false);
          }
        });
      }
    });
}

function contentToolsImageUploader(dialog) {
  var file, image, url, xhr, height, width, type;

  /**
   * Cancel upload
   */
  dialog.addEventListener('imageuploader.cancelupload', function() {
    if (xhr) {
      xhr.upload.removeEventListener('progress', xhrProgress);
      xhr.removeEventListener('readystatechange', xhrComplete);
      xhr.abort();
    }

    dialog.state('empty');
  });

  /**
   * Clear image
   */
  dialog.addEventListener('imageuploader.clear', function() {
    // Clear the current image
    dialog.clear();
    image = null;
  });

  /**
   * File is loaded
   */
  dialog.addEventListener('imageuploader.fileready', function(ev) {
    var fileReader = new FileReader();
    file = ev.detail().file;
    type = file.type;
    image = new Image();
    fileReader.readAsDataURL(file);
    fileReader.addEventListener('load', function(e) {
      url = e.target.result;
      image.src = url;
      image.onload = function() {
        width = this.width;
        height = this.height;
        setMaxWidth(1200, function(url, width, height) {
          dialog.populate(url, [width, height]);
        });
      };
    });
  });

  /**
   * Insert image
   */
  dialog.addEventListener('imageuploader.save', function() {
    var canvas, ctx;
    var h = mx.helpers;
    if (h.path(mx, 'settings.user.guest')) {
      return;
    }
    canvas = document.createElement('canvas');
    canvas.height = height;
    canvas.width = width;
    ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    ctx.save();
    canvas.toBlob(
      function(blob) {
        var form = new FormData();
        form.append('image', blob);
        form.append('width', width);
        form.append('height', height);
        form.append('token', h.path(mx, 'settings.user.token'));
        form.append('idUser', h.path(mx, 'settings.user.id'));
        form.append('project', h.path(mx, 'settings.project'));

        mx.helpers.sendData({
          url: mx.helpers.getApiUrl('uploadImage'),
          data: form,
          onProgress: function(progress) {
            dialog.progress(progress * 100);
          },
          onSuccess: function(data) {
            data = data.split('\t\n');
            data.forEach((d) => {
              try {
                d = JSON.parse(d);
              } catch (err) {}
              if (d.msg && d.msg.url && d.msg.size) {
                dialog.save(d.msg.url, d.msg.size, {
                  alt: 'img',
                  'data-ce-max-width': d.msg.size[0]
                });
              } else {
                console.log(d);
              }
            });
          },
          onError: function(er) {
            mx.helpers.modal({
              title: 'Error during the upload',
              content: 'An error occured during the upload : ' + er,
              styleString: 'z-index:11000'
            });
          }
        });

        // Set the dialog state to uploading and reset the progress bar to 0
        dialog.state('uploading');
        dialog.progress(0);
      },
      type || 'image/jpeg',
      0.95
    );
  });

  dialog.addEventListener('imageuploader.rotateccw', function() {
    dialog.busy(true);
    rotateImage(-90);
    dialog.busy(false);
  });

  dialog.addEventListener('imageuploader.rotatecw', function() {
    dialog.busy(true);
    rotateImage(90);
    dialog.busy(false);
  });

  function setMaxWidth(maxWidth, onLoad) {
    var ratio, scale, canvas, ctx, newWidth, newHeight;

    ratio = height / width;
    scale = maxWidth / width;

    if (width <= maxWidth) {
      onLoad(url, width, height);
    } else {
      newWidth = maxWidth;
      newHeight = newWidth * ratio;
      canvas = document.createElement('canvas');
      canvas.height = newHeight;
      canvas.width = newWidth;
      ctx = canvas.getContext('2d');
      ctx.save();
      ctx.drawImage(image, 0, 0, width, height, 0, 0, newWidth, newHeight);
      ctx.restore();
      url = canvas.toDataURL();
      image.src = url;
      image.onload = function() {
        width = this.width;
        height = this.height;
        onLoad(url, width, height);
      };
    }
  }

  function rotateImage(degrees) {
    var angle, canvas, ctx, to_radians, x, y, origWidth, origHeight;
    angle = degrees % 360;
    to_radians = Math.PI / 180;
    canvas = document.createElement('canvas');

    origWidth = width;
    origHeight = height;
    if (angle === 90 || angle === -270 || angle === 270 || angle === -90) {
      width = origHeight;
      height = origWidth;
      x = width / 2;
      y = height / 2;
    } else if (angle === 180) {
      width = origWidth;
      height = origHeight;
      x = width / 2;
      y = height / 2;
    } else {
      width = Math.sqrt(Math.pow(origWidth, 2) + Math.pow(origHeight, 2));
      height = width;
      x = origHeight / 2;
      y = origWidth / 2;
    }

    canvas.width = width;
    canvas.height = height;

    ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle * to_radians);
    ctx.drawImage(image, -origWidth / 2, -origHeight / 2);
    ctx.restore();

    url = canvas.toDataURL();
    image.src = url;

    image.onload = function() {
      width = this.width;
      height = this.height;
      dialog.populate(url, [width, height]);
    };
  }
}

/**
 * Clean + init
 */
function cleanInit(o) {
  const h = mx.helpers;
  /**
   * Remove old listener
   */
  mx.listenerStore.removeListenerByGroup('story_map');

  return new Promise(function(resolve) {
    /* Fetch view if not given */
    if (!o.view && o.id && o.idView) {
      var view = h.getView(o.idView);
      o.view = view;
    }

    /* set id view  */
    o.idView = o.idView || o.view.id;

    /* If no story, quit*/
    if (!h.path(o, 'view.data.story')) {
      console.log('No story to handle, abord');
      return;
    }

    /** Remove old stuff if any */
    var oldData = h.path(mx.data, 'story.data');

    if (oldData) {
      o.startScroll = oldData.elScroll.scrollTop;
    }
    if (oldData && oldData.close instanceof Function) {
      oldData.close();
    }

    o.enable = true;

    resolve(o);
  });
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
 * Evaluate missing view and fetch them if needed
 */
function checkMissingView(o) {
  const h = mx.helpers;
  const view = o.view;
  const views = h.getViews();
  const idViews = views.map((v) => v.id);
  const map = h.getMap(o.id);
  const idViewsStory = [];

  return new Promise(function(resolve) {
    const story = h.path(view, 'data.story', {});

    /**
     * Case views are stored within data.views (deprecated)
     */
    h.path(view, 'data.views', []).forEach((id) => {
      idViewsStory.push(id);
    });
    /**
     * Case when views are stored as object instead of id (deprecated).
     */
    if (h.isViewsArray(idViewsStory)) {
      idViewsStory.length = 0;
      idViewsStory.forEach((v) => idViewsStory.push(v.id));
    }

    /**
     * Case when views are not stored in data.view but only in steps (current behaviour).
     */
    getStoryViewsId(story).forEach((id) => {
      idViewsStory.push(id);
    });

    if (idViewsStory.length === 0) {
      resolve([]);
    } else {
      /**
       * Create a list of views id to download
       * ( e.g. if they are from another project )
       */
      const idViewsToAdd = idViewsStory.filter((id) => {
        return idViews.indexOf(id) === -1;
      });
      resolve(idViewsToAdd);
    }
  })
    .then((idViewsToAdd) => h.getViewsRemote(idViewsToAdd))
    .then((viewsToAdd) => {
      /**
       * Retrieved views as object
       */
      viewsToAdd.forEach((view) => {
        if (views.indexOf(view) === -1) {
          views.push(view);
        }
        h.addSourceFromView({
          map: map,
          view: view,
          noLocationCheck: true
        });
      });
      return o;
    });
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
  var map = o.data.map;
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
  mx.listenerStore.addListener({
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
    if(map.isMoving()){
      nf(loop);
    }else if (o.data.enabled) {
      data = o.onScrollData;
      // NOTE: this is weird.  scrollTop does not reflect actual dimension but non scaled ones.
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


function initBulletsListener(o){
  const h = mx.helpers; 
  var elBullets = h.el('div', {class: ['mx-story-step-bullets', 'noselect']});
  o.data.elBullets = elBullets; 
  o.data.elMapControls.appendChild(elBullets);
  mx.listenerStore.addListener({
    target: elBullets,
    type: 'click',
    callback: bulletScrollTo,
    group: 'story_map'
  });
  console.log('added bullets');
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
  var elBullets,elBullet, config, rect, elStep, elSteps, elSlides, stepName;
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
  elBullets.innerHTML = "";

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
        class: ['mx-story-step-bullet', 'mx-pointer', 'btn', 'hint--top'],
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
        console.warn(e, slideConfig);
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
  var isActive, isInRange, isInRangeAnim, toActivate, toRemove;
  var clHidden = 'mx-visibility-hidden';
  var clRemove = 'mx-display-none';
  var isHidden = false;
  //var classActive = 'mx-story-step-active';

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
    toRemove = !isInRange && isActive;
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
        stepNum: s
      });
      data.stepActive = s;

      /**
       * Update bullet values
       */
      for (var b = 0, bL = data.stepsConfig.length; b < bL; b++) {
        elBullet = data.stepsConfig[b].elBullet;
        if (b <= s) {
          elBullet.classList.add('mx-story-step-active');
        } else {
          elBullet.classList.remove('mx-story-step-active');
        }
      }
    }
  });
}

/*
 * listen for keydown
 */
function storyHandleKeyDown(event) {
  event.preventDefault();
  event.stopPropagation();
  var h = mx.helpers;

  switch (event.key) {
    case ' ':
      h.storyAutoPlay('start');
      break;
    case 'ArrowDown':
    case 'ArrowRight':
      h.storyAutoPlay('stop').then(function() {
        h.storyGoTo('next');
      });
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      h.storyAutoPlay('stop').then(function() {
        h.storyGoTo('previous');
      });
      break;
    default:
      return;
  }
}

export function storyGoTo(to, useTimeout, funStop) {
  var h = mx.helpers;
  var data = h.path(mx, 'data.story');
  if (!data || !data.data || !data.data.stepsConfig) {
    return;
  }
  var steps = h.path(data, 'view.data.story.steps', []);
  var stepsDim = h.path(data, 'data.stepsConfig');
  var elStory = data.data.elScroll;
  var start = elStory.scrollTop;
  var stop = 0;
  var timeout = 0;
  var currentStep = h.path(data, 'data.currentStep') || 0;
  var step,
    maxStep,
    nextStep,
    previousStep,
    destStep,
    duration,
    easing,
    easing_p;

  maxStep = steps.length - 1;

  if (isFinite(to)) {
    destStep = to >= maxStep ? maxStep : to < 0 ? 0 : to;
  } else if (to === 'next' || to === 'n') {
    nextStep = currentStep + 1;
    destStep = nextStep > maxStep ? 0 : nextStep;
  } else if (to === 'previous' || to === 'p') {
    previousStep = currentStep - 1;
    destStep = previousStep < 0 ? maxStep : previousStep;
  } else {
    return;
  }

  stop = stepsDim[destStep].startUnscaled;
  step = steps[currentStep];

  easing = h.path(step, 'autoplay.easing') || 'easeIn';
  duration = h.path(step, 'autoplay.duration') || 1000;
  easing_p = h.path(step, 'autoplay.easing_power') || 1;

  if (useTimeout) {
    timeout = h.path(step, 'autoplay.timeout') || 1000;
  }

  return h
    .scrollFromTo({
      emergencyStop: funStop,
      timeout: timeout,
      el: elStory,
      from: start,
      to: stop,
      during: duration,
      using: h.easingFun({
        type: easing,
        power: easing_p
      })
    })
    .then(function() {
      return {
        step: destStep,
        end: destStep === maxStep
      };
    });
}

export function storyAutoPlay(cmd) {
  var h = mx.helpers;
  var data = h.path(mx.data, 'story.data', {});
  var enabled = data.autoplay || false;
  var playStart = cmd === 'start' && !enabled;
  var playStop = (cmd === 'stop' && enabled) || (cmd === 'start' && enabled);
  var playNext = cmd === 'next' && enabled;

  return new Promise(function(resolve) {
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
      h.storyGoTo('next', true, stopControl).then(function() {
        if (data.autoplay) {
          storyAutoPlay('next');
        }
      });
    }
    resolve(data.autoplay);
  });
}

//function storyAutoplayStop(stop){
//var h = mx.helpers;
//var data = h.path(mx.data,"story.data");
//if( data ){
//if( typeof(stop) === "boolean" ){
//data.autoplayStop = stop;
//}
//return data.autoplayStop === true;
//}
//}

//export function storyAutoplay(cmd){
//var h = mx.helpers;
//var data = h.path(mx.data,"story.data");

//if(data){

//var stop = storyAutoplayStop();

//if( cmd === "start"){
//stop = !stop;
//if( !stop ){
//h.iconFlash("play");
//storyAutoplayStop(false);
//}
//}

//if( stop ){

//storyAutoplayStop(true);
//h.iconFlash("stop");
//return;

//}else{

//h.storyGoTo("next",true,storyAutoplayStop)
//.then(function(res){
//storyAutoplay("continue");
//});
//}
//}
//}

/**
 * Control map pan during story map
 * @param {Object} o options
 * @param {Boolean} o.recalc Revaluate the state stored in dataset
 * @param {Boolean} o.unlock Unlock map pan
 * @param {Boolean} o.toggle Inverse the current state
 */
export function storyControlMapPan(o) {
  o = o || {};
  var toUnlock = true;
  var liBtn = document.getElementById('btnStoryUnlockMap');
  var btn = liBtn.querySelector('div');
  var story = document.getElementById('story');
  var isUnlock = liBtn.dataset.map_unlock === 'on';

  if (o.recalc) {
    toUnlock = isUnlock;
  } else if (o.unlock || (o.toggle && !isUnlock)) {
    toUnlock = o.unlock;
  } else {
    toUnlock = liBtn.dataset.map_unlock === 'off';
  }

  liBtn.dataset.map_unlock = toUnlock ? 'on' : 'off';

  if (toUnlock) {
    btn.classList.remove('fa-lock');
    btn.classList.add('fa-unlock');
    story.classList.add('mx-events-off');
  } else {
    btn.classList.add('fa-lock');
    btn.classList.remove('fa-unlock');
    story.classList.remove('mx-events-off');
  }
}

/*
 * Enable or disable story map controls
 * @param {Object} o options
 * @param {Object} o.data Story props and cache
 * @param {Boolean} o.enable Enable / start story
 */
export function storyController(o) {
  var h = mx.helpers;

  o.selectorDisable = o.selectorDisable || [
    '#mxDashboards',
    '#btnTabDashboard',
    '#btnToggleBtns',
    '#btnPrint',
    '#btnTabTools',
    '#btnThemeAerial',
    '#btnTabSettings',
    '#btnTabView',
    '#btnShowLanguage',
    '#btnShowCountry',
    '#btnShowLogin',
    '#btnZoomIn',
    '#btnZoomOut',
    '#btnDrawMode',
    '.mx-panels-container'
  ];
  o.selectorEnable = o.selectorEnable || [
    '#btnStoryUnlockMap',
    '#btnStoryClose',
    '#story'
  ];

  if (o.autoStart) {
    o.selectorEnable = ['#btnStoryUnlockMap', '#story'];
  }

  var elBtnClose = document.querySelector('#btnStoryClose');
  var elBtnPreview = document.querySelector('#btnViewPreviewStory');

  var toDisable = {
    selector: o.enable === true ? o.selectorDisable : o.selectorEnable,
    action: 'add',
    class: 'mx-display-none'
  };

  var toEnable = {
    selector: o.enable === true ? o.selectorEnable : o.selectorDisable,
    action: 'remove',
    class: 'mx-display-none'
  };

  h.classAction(toEnable);
  h.classAction(toDisable);

  o.id = o.id || 'map_main';

  if (o.enable === true) {
    /**
     *Check for previews views list ( in case of update );
     */
    var oldViews = h.path(mx.data, 'story.data.views');
    if (!mx.helpers.isArray(oldViews)) {
      oldViews = h.getViewsOnMap(o);
    }

    /* Save current values */
    o.data = {
      enabled: true,
      map: mx.maps[o.id].map,
      views: oldViews,
      setWrapperLayout: function() {},
      position: mx.helpers.getMapPos(o),
      currentStep: 0,
      hasAerial: mx.helpers.btnToggleLayer({
        id: 'map_main',
        idLayer: 'here_aerial',
        idSwitch: 'btnThemeAerial',
        action: 'hide'
      }),
      listeners: [],
      autoplayStop: true
    };

    oldViews.forEach((id) => {
      h.closeView({
        id: o.id,
        idView: id
      });
    });

    o.data.close = function() {
      if (this && this.hasAttribute && this.hasAttribute('disabled')) {
        return;
      }
      o.enable = false;
      storyController(o);
    };

    mx.listenerStore.addListener({
      target: elBtnClose,
      type: 'click',
      callback: o.data.close,
      group: 'story_map'
    });
  } else {
    /**
     * Remvove registered listener
     */

    mx.listenerStore.removeListenerByGroup('story_map');

    /**
     * Remove layers added by the story
     */
    h.getViewsOnMap(o).forEach((id) => {
      h.closeView({
        id: o.id,
        idView: id
      });
    });

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
      if (o.data.hasAerial) {
        h.btnToggleLayer({
          id: 'map_main',
          idLayer: 'here_aerial',
          idSwitch: 'btnThemeAerial',
          action: 'show'
        });
      }

      /**
       * Enable previously enabled layers
       */
      o.data.views.forEach(function(idView) {
        console.log('add again  view ' + idView);
        h.renderView({
          id: o.id,
          idView: idView,
          debug: true
        });
      });

      /**
       * Rest previous position
       */

      if (o.data.position) {
        var pos = o.data.position;
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

      if (o.data.elScroll) {
        o.data.elScroll.remove();
      }

      if (o.data.elStory) {
        o.data.elStory.remove();
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

      o.data.map.resize();

      /**
       * clean data storage
       */

      if (mx.data.story) {
        mx.data.story = {};
      }
    }
  }

  /**
   * If button preview exist, set disabled to false
   */

  if (elBtnPreview) {
    elBtnPreview.removeAttribute('disabled');
  }
}

/**
 * Listener manager
 * @param {Object} o Story options
 * @param {Object} config Config
 * @param {Element} config.target Target element
 * @param {Function} config.onDestroy Function to run on destroy
 * @param {Element} config.action `add`,`remove`,`removeAll`
 * @param {String} config.event name
 * @param {Function} config.listener Listener function
 */
//function listenerManager(o, config) {
//var c = config;
//var h = mx.helpers;
//if (c.action === 'add') {
//c.target.addEventListener(c.event, c.listener);

//c.destroy = function() {
//var e = c.event;
//var l = c.listener;
//var onDestroy = c.onDestroy || function() {};
//c.target.removeEventListener(e, l);
//onDestroy();
//};

//o.data.listeners.push(c);
//} else {
//var listeners =
//h.path(o, 'data.listeners') || h.path(mx.data, 'story.data.listeners');
//if (listeners) {
//listeners.forEach(function(l) {
//l.destroy();
//});
//}
//}
/*}*/

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

  var elMapContainer = o.data.map.getContainer();
  var elStoryContainer = el(
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
  elMapContainer.appendChild(elStoryContainer);

  /**
   * Handle broken images
   */
  var imgs = elStoryContainer.querySelectorAll('img');
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
  var steps = h.path(o, 'view.data.story.steps');
  var data = h.path(mx.data, 'story.data');
  var stepNum = o.stepNum;
  var step, pos, anim, easing, vStep, vToAdd, vVisible, vToRemove;
  var m = h.getMapData();

  data.currentStep = stepNum;

  if (!steps) {
    console.log('No steps found');
    return;
  }
  /**
   * retrieve step information
   */
  step = steps[stepNum];
  pos = step.position;
  anim = step.animation || {
    duration: 1000,
    easing: 'easeIn',
    easing_power: 1,
    method: 'easeTo'
  };
  vStep = step.views.map(function(v) {
    return v.view;
  });
  easing = h.easingFun({type: anim.easing, power: anim.easing_power});

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
   * Add view if not alredy visible
   */
  h.onNextFrame(function() {
    vVisible = h.getViewsOnMap(o);
    vToRemove = h.getArrayDiff(vVisible, vStep);
    vToAdd = h.getArrayDiff(vStep, vVisible);

    vToAdd.forEach(function(v, i) {
      var vPrevious = vStep[i - 1] || mx.settings.layerBefore;
      h.renderView({
        id: o.id,
        idView: v,
        before: vPrevious,
        noUi: true
      });
    });

    vToRemove.forEach(function(v) {
      h.closeView({
        id: o.id,
        idView: v
      });
    });

    h.updateViewOrder({
      order: vStep,
      id: o.id
    });
  });
}
