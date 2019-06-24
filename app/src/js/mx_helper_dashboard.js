/* jshint esversion:6, evil: true */

export function Dashboard(idContainer, idDashboard, view) {
  var dashboard = this;
  var modules = mx.helpers.path(view, 'data.dashboard.modules');
  if (typeof modules === 'string') {
    modules = [modules];
  }
  if (!modules || modules.length === 0) {
    modules = ['highcharts'];
  }
  /**
   * Init
   */
  dashboard.elContainer = document.getElementById(idContainer);
  dashboard.store = Dashboard.getStore() || [];
  dashboard.modules = {};

  /**
   * Fetch module
   */
  return Promise.all([
    import('packery'),
    import('draggabilly'),
    mx.helpers.modulesLoad(modules)
  ]).then(function(m) {
    /**
     * Add modules in dashboard instance for quick ref
     * from the editor
     */
    dashboard.modules.packery = m[0].default;
    dashboard.modules.draggabilly = m[1].default;

    modules.forEach((mod, i) => {
      dashboard.modules[mod] = m[2][i];
    });

    /**
     * Build UI
     */
    dashboard.build = function() {
      Dashboard.showPanel(true);
      dashboard.elGrid = document.createElement('div');
      dashboard.elGrid.className = 'grid mx-dashboard';
      dashboard.elContainer.appendChild(dashboard.elGrid);
      dashboard.widgets = [];
      dashboard.packery = new dashboard.modules.packery(dashboard.elGrid, {
        itemSelector: '.grid-item',
        columnWidth: 50,
        rowHeight: 50,
        gutter: 5,
        transitionDuration: 100,
        stagger: 0
      });
    };
    /**
     * Hide dashboard
     */

    dashboard.hide = function() {
      dashboard.elGrid.classList.add('mx-hide');
      dashboard.visible = false;
    };

    /*
     * Show dashboard
     */
    dashboard.show = function() {
      dashboard.elGrid.classList.remove('mx-hide');
      dashboard.visible = true;
    };

    /**
     * Remove dashboard from the window, delete from view
     */

    dashboard.remove = function() {
      dashboard.elGrid.remove();
      dashboard.packery.destroy();
    };

    /**
     * Destroy dashboard content and/or remove on callback
     */
    dashboard.destroy = function() {
      /*
       * Clean remove all widgets
       */

      var widgets = dashboard.widgets;

      if (widgets.length === 0) {
        /*
         * remove it now
         */
        dashboard.remove();
      } else {
        /*
         * remove it after all widgets have been removed
         * the last one removed should trigger dashboard.remove()
         */
        widgets.forEach((w) => w.remove());
      }

      /*
       * Removing other references
       */
      delete view._dashboard;
      var pos = dashboard.store.indexOf(dashboard);
      if (pos > -1) {
        mx.dashboards.splice(pos, 1);
      }
      if (mx.dashboards.length === 0) {
        mx.helpers.Dashboard.showPanel(false);
      }
    };

    dashboard.store.push(dashboard);
    dashboard.build();
    return dashboard;
  });
}

/**
 * Widget method
 */

Dashboard.prototype.Widget = function(config) {
  var widget = this;
  var dashboard = config.dashboard;

  widget.init = function(config) {
    if (widget._init) {
      return Promise.resolve(false);
    }

    /**
     * Eval the script, dump error in console
     */
    return widget
      .strToObj(config.script)
      .then(function(register) {
        for (var r in register) {
          widget[r] = register[r];
        }
      })
      .then(function() {
        /**
         * Keep config, modules and set id
         */
        widget.config = config;
        widget.id = widget.randomValue();
        widget.modules = dashboard.modules;
        widget.add();
        widget.setUpdateDataMethod();
        /**
         * Set init flag to true
         */
        widget._init = true;
      });
  };

  /**
   * Add widget
   */

  widget.add = function() {
    widget.build();
    widget.setSize(widget.config.height, widget.config.width);
    dashboard.widgets.push(widget);
    mx.widgets.push(widget);
    widget.show();
    widget.onAdd(widget);
  };

  /*
   * Build ui
   */
  widget.build = function() {
    var el = mx.helpers.el;

    widget.el = el(
      'div',
      {
        class: ['noselect', 'grid-item']
      },
      el(
        'div',
        {
          class: ['btn-widget-group']
        },
        (widget.elButtonClose = el('button', {
          class: [
            'btn-circle',
            'btn-widget',
            'btn-widget-right',
            'fa',
            'fa-times'
          ],
          on: {click: widget.remove}
        })),
        el('button', {
          class: [
            'btn-circle',
            'btn-widget',
            'btn-widget-left',
            'fa',
            'fa-arrows',
            'handle'
          ]
        })
      ),
      (widget.elContent = el('div', {
        class: ['grid-item--content', 'shadow']
      }))
    );

    widget._removeBtnCloseListener = function() {
      widget.elButtonClose.removeEventListener('click', widget.remove);
    };

    dashboard.elGrid.appendChild(widget.el);
  };

  /**
   * Update widget data using attributes
   */
  widget.updateDataFromAttribute = function() {
    var d = mx.helpers.path(config, 'view.data.attribute.table');
    widget.setData(d);
  };

  /**
   * Update widget data after a click
   */
  widget.updateDataFromLayerOnClick = function(e) {
    getWidgetDataFromLinkedView({
      point: e.point
    }).then(function(data) {
      widget.setData(data);
    });
  };

  /**
   * Update widget data after any map rendering
   */
  widget.updateDataFromLayerOnRender = function() {
    getWidgetDataFromLinkedView().then(function(data) {
      widget.setData(data);
    });
  };

  /**
   * Instantiate widget method for setting data
   */
  widget.setUpdateDataMethod = function() {
    var map = widget.config.map;
    var update;

    switch (widget.config.source) {
      case 'none':
        widget.setData();
        break;
      case 'viewFreqTable':
        widget.updateDataFromAttribute();
        break;
      case 'layerChange':
        update = widget.updateDataFromLayerOnRender;
        map.on('render', update);
        widget._removeMapListener = function() {
          map.off('render', update);
        };
        break;
      case 'layerClick':
        widget.handleClick(true);
        update = widget.updateDataFromLayerOnClick;
        map.on('click', update);
        widget._removeMapListener = function() {
          widget.handleClick(false);
          map.off('click', update);
        };
    }
  };

  widget.setSize = function(height, width) {
    var h = toDim(height);
    var w = toDim(width);
    this.el.style.width = sizeWithGutter(w) + 'px';
    this.el.style.height = sizeWithGutter(h) + 'px';
  };

  widget.hide = function() {
    dashboard.packery.remove(widget.el);
    widget.visible = true;
  };

  widget.show = function() {
    dashboard.packery.appended(widget.el);
    if (!widget.config.draggie) {
      var itDg = new dashboard.modules.draggabilly(widget.el, {
        handle: '.handle'
      });
      dashboard.packery.bindDraggabillyEvents(itDg, {});
      widget.config.draggie = itDg;
    }
    widget.visible = true;
  };

  widget.remove = function() {
    /*
     * Exec widget on remove
     */
    widget.onRemove(widget);

    /**
     * Remove timers if any
     */
    if (widget.timer) {
      window.clearInterval(widget.timer);
      window.clearTimeout(widget.timer);
    }

    if (mx.helpers.isFunction(widget._removeMapListener)) {
      widget._removeMapListener();
    }
    if (mx.helpers.isFunction(widget._removeBtnCloseListener)) {
      widget._removeBtnCloseListener();
    }
    /**
     * Register a unique event
     */
    dashboard.packery.once('removeComplete', function() {
      /*
       * Remove from widget store and global widgets
       */
      var pos = dashboard.widgets.indexOf(widget);
      if (pos > -1) {
        dashboard.widgets.splice(pos, 1);
      }
      pos = mx.widgets.indexOf(widget);
      if (pos > -1) {
        mx.widgets.splice(pos, 1);
      }

      widget.handleClick(false);

      /**
       * If this is the last one, destroy the dashboard;
       */
      if (dashboard.widgets.length === 0) {
        dashboard.destroy();
      }
    });

    /**
     * Hide widget
     */
    widget.hide();

    /**
     * Reset layout
     */
    dashboard.packery.shiftLayout();
  };

  widget.handleClick = function(enable) {
    widget._handleClick = enable;
    /**
     * Update global click handling
     */
    mx.helpers.setClickHandler({
      type: 'dashboard',
      enable: mx.helpers.any(mx.widgets.map((w) => w._handleClick === true))
    });
  };

  widget.setContent = function(c) {
    c = c || '<p> content for widget' + widget.id + ' </p>';
    widget.elContent.innerHTML = c;
  };

  widget.setData = mx.helpers.debounce(function(d) {
    if (widget.data === d) {
      return;
    }
    var hasData = !mx.helpers.isEmpty(d);
    var ignoreEmptyData = widget.config.sourceIgnoreEmpty;
    var triggerOnData = hasData || (!hasData && !ignoreEmptyData);
    if (triggerOnData) {
      widget.data = hasData ? d : [];
      widget.onData(widget, widget.data);
    }
  }, 100);

  widget.strToObj = function(str) {
    return new Promise(function(resolve, reject) {
      var r = function() {};
      if (str) {
        r = new Function(str)();
      }
      if (r) {
        resolve(r);
      } else {
        reject(Error('strToObj failed. Script = ' + str));
      }
    });
  };

  widget.randomValue = function(from, to) {
    from = from || 0;
    to = to || 100;
    return from + Math.round(Math.random() * (to - from));
  };

  widget.randomData = function() {
    var a = [];
    var n = widget.randomValue(3, 10);
    for (var i = 0; i < n; i++) {
      var d = widget.randomValue(3, 10);
      a.push({y: d, name: n + ''});
    }
    return a;
  };

  widget.randomChart = function(el) {
    var hc = Highcharts;
    // Build the chart
    el.chart = hc.chart(el, {
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: ['pie', 'bar', 'line'][Math.round(Math.random() * 2)]
      },
      credits: {
        text: 'MapX',
        href: 'http://www.mapx.org'
      },
      title: {
        text: 'TEST'
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: false
          },
          showInLegend: true
        }
      },
      series: [
        {
          name: 'Test',
          colorByPoint: true,
          data: randomData()
        }
      ]
    });
  };

  return widget.init(config);

  /**
   * Helpers
   */

  /**
   * Data from layers
   * @param {Object} opt Options
   * @param {Object} opt.point Point data
   */
  function getWidgetDataFromLinkedView(opt) {
    var h = mx.helpers;
    var id = widget.config.id;
    var items = h.getLayersPropertiesAtPoint({
      map: widget.config.map,
      type: widget.config.type,
      point: opt.point,
      idView: id
    });
    return items[id] || [];
  }

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
};

/**
 * Add and configure a dashboard
 * @param {Object} o Options
 * @param {String} o.id Map id
 * @param {String} o.idDashboard dashboard id
 * @param {Object} o.view View object
 * @param {Object} o.data Dashboard data. Default is view.data.dashboard
 */
Dashboard.init = function(o) {
  var view = o.view;
  var idDashboard = o.idDashboard || 'mx-dashboard-' + mx.helpers.makeId();
  var idContainer = o.idContainer || mx.settings.ui.ids.idDashboards;
  var dashboardData = o.data || mx.helpers.path(view, 'data.dashboard');

  if (!dashboardData || !dashboardData.widgets) {
    return;
  }
  if (view._dashboard) {
    view._dashboard.destroy();
  }

  new Dashboard(idContainer, idDashboard, view)
    .then(function(dashboard) {
      /**
       * Keep a ref to the dashboard in view
       */
      view._dashboard = dashboard;

      view._onRemoveDashboard = function() {
        if (view._dashboard && view._dashboard.destroy instanceof Function) {
          view._dashboard.destroy();
        }
      };

      /**
       * Add widgets
       */
      return dashboardData.widgets.map(function(w) {
        var config = {
          id: view.id,
          dashboard: dashboard,
          source: w.source,
          sourceIgnoreEmpty: w.sourceIgnoreEmpty !== false,
          height: w.height,
          width: w.width,
          script: w.script,
          map: mx.helpers.getMap(o.idMap),
          packery: dashboard.packery,
          view: view,
          type: view.type
        };

        return new dashboard.Widget(config);
      });
    })
    .catch((e) => {
      throw new Error(e);
    });
};

Dashboard.getStore = function() {
  if (mx.dashboards) {
    return mx.dashboards;
  } else {
    window.dashboards = [];
    return window.dashboards;
  }
};

Dashboard.hasWidgets = function() {
  return Dashboard.getStore().map((d) => d.widgets).length > 0;
};

Dashboard.hasWidgetsVisibles = function() {
  return (
    Dashboard.getStore()
      .map((d) => {
        d.widgets.filter((w) => w.visible === true);
      })
      .reduce((all, widget) => {
        all.concat(widget);
      }).length > 0
  );
};

Dashboard.hasDashboards = function() {
  return Dashboard.getStore().length > 0;
};

Dashboard.hasDashboardsVisible = function() {
  return Dashboard.getStore().filter((d) => d.visible === true).length > 0;
};

Dashboard.hideAllDashboards = function() {
  Dashboard.getStore().forEach((d) => d.hide());
};
Dashboard.removeAllDashboards = function() {
  Dashboard.showPanel(false);
  Dashboard.getStore().forEach((d) => d.destroy());
};

Dashboard.showAllDashboards = function() {
  Dashboard.showPanel(true);
  Dashboard.getStore().forEach((d) => d.show());
};

Dashboard.togglAllDashboards = function() {
  if (Dashboard.hasDashboardsVisible()) {
    Dashboard.hideAllDashboards();
  } else {
    Dashboard.showAllDashboards();
  }
};

Dashboard.showPanel = function(enable, id) {
  var classEnable = 'enabled';
  var classActive = 'active';
  var toggle = enable === 'toggle';
  var elPanel = document.getElementById(
    id || mx.settings.ui.ids.idDashboardsPanel
  );
  var elButton = document.getElementById(mx.settings.ui.ids.idDashboardsButton);

  if (!elPanel || !elButton) {
    return;
  }

  if (toggle) {
    elPanel.classList.toggle(classEnable);
    elButton.classList.toggle(classActive);
  } else if (enable) {
    elPanel.classList.add(classEnable);
    elButton.classList.add(classActive);
  } else {
    elPanel.classList.remove(classEnable);
    elButton.classList.remove(classActive);
  }

  return !!elPanel.classList.contains(classEnable);
};
