import {el} from '@fxi/el';
import {helpers as h} from './../mx.js';
import {ListenerStore} from '../listener_store/index.js';

/**
 * Widget method
 */

const defaults = {
  conf: {
    source: 'none',
    width: 'x50',
    height: 'y50',
    addColorBackground: false,
    colorBackground: '#fff',
    sourceIgnoreEmpty: false,
    script:
      'return { onAdd:console.log, onRemove:console.log, onData:console.log}'
  },
  language : 'en',
  map: null,
  view: null,
  dashboard: null
};

class Widget {
  constructor(config) {
    const widget = this;
    widget.opt = Object.assign({}, defaults, config);
    widget.init();
  }

  init() {
    const widget = this;
    if (widget._init) {
      return;
    }
    widget.ls = new ListenerStore();
    widget.id = Math.random().toString(32);

    /**
     * Build and set size
     */
    widget.build();
    widget.setSize(widget.opt.conf.height, widget.opt.conf.width);

    /**
     * Eval the script, dump error in console
     */
    return widget
      .strToObj(widget.opt.conf.script)
      .then(function(register) {
        for (var r in register) {
          widget[r] = register[r];
        }
      })
      .then(function() {
        widget.modules = h.path(widget.opt, 'dashboard.modules', {});
        widget.add();
        widget.setUpdateDataMethod();
        /**
         * Set init flag to true
         */
        widget._init = true;
      })
      .catch((e) => {
        console.error(e);
        widget.destroy();
      });
  }

  /**
   * Update widget data using attributes
   */
  updateDataFromAttribute() {
    const widget = this;
    var d = h.path(widget.opt, 'view.data.attribute.table', []);
    widget.setData(d);
  }

  /**
   * Update widget data after a click
   */
  updateDataFromLayerAtMousePosition(e) {
    const widget = this;
    widget.getWidgetDataFromLinkedView(e).then(function(data) {
      widget.setData(data);
    });
  }

  /**
   * Update widget data after any map rendering
   */
  updateDataFromLayerOnRender() {
    const widget = this;
    widget.getWidgetDataFromLinkedView().then((data) => {
      widget.setData(data);
    });
  }

  /**
   * Data from layers
   */
  getWidgetDataFromLinkedView(e) {
    const widget = this;
    const idView = h.path(widget.opt, 'view.id', widget.id);
    const viewType = h.path(widget.opt, 'view.type', null);

    if (!viewType || !idView) {
      return [];
    }
    const items = h.getLayersPropertiesAtPoint({
      map: widget.opt.map,
      type: viewType,
      point: e ? e.point : null,
      idView: idView
    });
    return items[idView] || [];
  }
  /**
   * Instantiate widget method for setting data
   */
  setUpdateDataMethod() {
    const widget = this;
    const map = widget.opt.map;

    switch (widget.opt.conf.source) {
      case 'none':
        widget.setData();
        break;
      case 'viewFreqTable':
        widget.updateDataFromAttribute();
        break;
      case 'layerChange':
        widget.ls.addListener({
          target: map,
          bind: widget,
          group: 'base',
          type: 'render',
          debounce: true,
          debounceTime: 300,
          callback: widget.updateDataFromLayerOnRender
        });
        break;
      case 'layerClick':
        widget.handleClick(true);
        widget.ls.addListener({
          target: map,
          bind: widget,
          group: 'base',
          type: 'click',
          debounce: false,
          callback: widget.updateDataFromLayerAtMousePosition
        });
        break;
      case 'layerOver':
        widget.ls.addListener({
          target: map,
          bind: widget,
          group: 'base',
          type: 'mousemove',
          debounce: true,
          callback: widget.updateDataFromLayerAtMousePosition
        });
    }
  }

  setSize(height, width) {
    const w = this;
    w.width = width;
    w.height = height;
  }

  set width(width) {
    const w = this;
    w._width = sizeWithGutter(toDim(width));
    w.el.style.width = w.width + 'px';
  }

  set height(height) {
    const w = this;
    w._height = sizeWithGutter(toDim(height));
    this.el.style.height = w.height + 'px';
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  build() {
    const widget = this;
    const conf = widget.opt.conf;
    const lang = h.path(widget, 'dashboard.opt.dashboard.language',h.path(widget,'opt.language'));
    const title = h.path(widget, `view.data.dashboard.title.${lang}`,h.path(widget,'view._title', ''));
    
    widget.el = el(
      'div',
      {
        class: ['noselect', 'widget']
      },
      el(
        'div',
        {
          class: ['btn-widget-group'],
          title: title
        },
        (widget.elButtonClose = el('button', {
          class: ['btn-circle', 'btn-widget', 'fa', 'fa-times']
        })),
        el('button', {
          class: ['btn-circle', 'btn-widget', 'fa', 'fa-arrows', 'handle']
        })
      ),
      (widget.elContent = el('div', {
        class: ['widget--content', 'shadow'],
        style: {
          backgroundColor: conf.addColorBackground ? conf.colorBackground : null
        }
      }))
    );
  }

  add() {
    const widget = this;
    const grid = widget.grid;
    widget.onAdd(widget);
    widget.ls.addListener({
      target: widget.elButtonClose,
      bind: widget,
      callback: widget.destroy,
      group: 'base',
      type: 'click'
    });
    grid.add(widget.el);
  }

  get grid() {
    return h.path(this.opt, 'grid', {});
  }
  get dashboard() {
    return h.path(this.opt, 'dashboard', {});
  }
  get map() {
    return h.path(this.opt, 'map', {});
  }
  get view() {
    return h.path(this.opt, 'view', {});
  }
  destroy(skipOnRemove) {
    const widget = this;
    const dashboard = widget.dashboard;
    //const grid = widget.grid;
    if (widget._destroyed) {
      return;
    }
    widget._destroyed = true;

    /**
     * Remove from grid
     */
    widget.grid.remove(widget.el);

    /**
     * Remove all listeners
     */
    widget.ls.destroy();

    /**
     * Remove element
     */
    widget.el.remove();

    /*
     * Exec widget on remove
     */
    if (!skipOnRemove) {
      /*
       * Case normal remove
       */
      widget.onRemove(widget);
    }
    /**
     * Remove timers if any
     */
    if (widget.timer) {
      window.clearInterval(widget.timer);
      window.clearTimeout(widget.timer);
    }

    /**
     * Remove from dashboard config
     */
    dashboard.removeWidget(widget);

    /**
     * Don't intercept click
     */
    widget.handleClick(false);
  }

  handleClick(enable) {
    const widget = this;
    const widgets = widget.dashboard.widgets;
    widget._handleClick = enable === true;
    const dashboardHandleClick = h.any(
      widgets.map((w) => w._handleClick === true)
    );
    /**
     * Update global click handling
     */
    h.setClickHandler({
      type: 'dashboard',
      enable: dashboardHandleClick
    });

    /*console.log({*/
    //widget : widget,
    //handleclick: widget._handleClick,
    //dashboardHandleClick: dashboardHandleClick
    /*});*/
  }

  setContent(c) {
    const widget = this;
    c = c || `<p> content for widget ${widget.id} </p> `;
    widget.elContent.innerHTML = c;
  }

  setData(d) {
    const widget = this;
    const hasData = !h.isEmpty(d);
    const ignoreEmptyData = widget.opt.conf.sourceIgnoreEmpty;
    const triggerOnData = hasData || (!hasData && !ignoreEmptyData);
    if (triggerOnData) {
      widget.data = hasData ? d : [];
      widget.onData(widget, widget.data);
    }
  }

  strToObj(str) {
    const w = this;
    return new Promise(function(resolve, reject) {
      var r = {};
      if (str) {
        r = new Function(str)();
      }
      if (r) {
        for (var f in r) {
          var rBinded = r[f].bind(w);
          r[f] = w.tryCatched(rBinded, f === 'onRemove');
        }
        resolve(r);
      } else {
        reject(`strToObj failed. Script = $str`);
      }
    });
  }

  tryCatched(fun, skipOnRemove) {
    const widget = this;
    return function(...args) {
      try {
        return fun(...args);
      } catch (e) {
        console.error(e);
        widget.destroy(skipOnRemove);
      }
    };
  }
}

export {Widget};

/*
 * Set dim + adding gutter size
 * @param {Number} size size
 * @param {Number} sizeGrid width/height of grid
 * @param {Number} sizeGutter gutter width
 */
function sizeWithGutter(size, sizeGrid, sizeGutter) {
  var s = size * 1 || 100;
  var gu = sizeGutter / 2 || 5;
  var gr = sizeGrid * 1 || 50;
  return s + (s / gr) * gu - gu;
}

/**
 * Backward compability for classes
 */
function toDim(dim) {
  var oldClasses = {
    x50: 50,
    x1: 150,
    x2: 300,
    x3: 450,
    x4: 600,
    y50: 50,
    y1: 150,
    y2: 300,
    y3: 450,
    y4: 600
  };
  return dim * 1 ? dim : oldClasses[dim] || 100;
}
