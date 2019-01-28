/* jshint esversion:6, evil: true */




export function Dashboard(idContainer,idDashboard,view) {

  var dashboard = this;
  var modules = mx.helpers.path(view,'data.dashboard.modules');
  if( typeof modules == "string" ) modules = [modules];
  if( !modules || modules.length == 0 ){
    modules = ['highcharts'];
  }
  /**
   * Init
   */
  dashboard.store = Dashboard.getStore() || [];

  dashboard.elContainer = document.getElementById(idContainer);
  dashboard.modules = {};

  /**
   * Fetch module 
   */
  return  Promise.all([
    import("packery"),
    import("draggabilly"),
    mx.helpers.modulesLoad(modules)
  ])
    .then(function(m){
      
      /**
       * Add modules in dashboard instance for quick ref 
       * from the editor
       */
      dashboard.modules.packery = m[0].default;
      dashboard.modules.draggabilly = m[1].default;

      modules.forEach((mod,i) => {
        dashboard.modules[mod] = m[2][i];
      });


      /**
       * Build UI
       */
      dashboard.build = function(){
        Dashboard.showPanel(true);
        dashboard.elGrid = document.createElement("div");
        dashboard.elGrid.className = "grid mx-dashboard";
        dashboard.elContainer.appendChild(dashboard.elGrid);
        dashboard.widgets = [];
        dashboard.packery = new dashboard.modules.packery( dashboard.elGrid, {
          itemSelector: '.grid-item',
          columnWidth: 50,
          rowHeight: 50,
          gutter : 5,
          transitionDuration: 100,
          stagger : 0
        });
      };
      /**
       * Hide dashboard
       */     
      dashboard.hide =  function(){
        dashboard.elGrid.classList.add("mx-hide");
        dashboard.visible = false;
      };

      /*
      * Show dashboard
      */
      dashboard.show =  function(){
        dashboard.elGrid.classList.remove("mx-hide");
        dashboard.visible = true;
      };

      /**
       * Remove dashboard from the window, delete from view
       */     
      dashboard.remove =  function(){
        dashboard.elGrid.remove();
        dashboard.packery.destroy();
      };

      /**
       * Destroy dashboard content and/or remove on callback
       */
      dashboard.destroy = function(){

        /*
         * Clean remove all widgets
         */ 
        var widgets = dashboard.widgets;        

        if( widgets.length  === 0 ){
          /* 
           * remove it now
           */
          dashboard.remove();           
        }else{ 
          /* 
           * remove it after all widgets have been removed
           * the last one removed should trigger dashboard.remove()
           */
          widgets.forEach(w => w.remove()); 
        }


        /*
         * Removing other references
         */
        delete view._dashboard;
        var pos = dashboard.store.indexOf(dashboard);
        if( pos > -1 ){
          mx.dashboards.splice(pos,1);
        }
        if( mx.dashboards.length == 0 ){
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

  widget.init = function( config ) {
    if(widget._init) return Promise.resolve(false) ;

    /**
     * Eval the script, dump error in console
     */
    return widget.strToObj( config.script )
      .then(function(register) {
        for (var r in register) {
          widget[r] = register[r];
        }
      })
      .then(function() { 
        
        /**
         * Keep config, modules and set id
         */
        widget.config =  config;
        widget.id = config.id || widget.randomValue();
        widget.modules = dashboard.modules;
        dashboard.widgets.push(widget);
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
      var buttonClose = document.createElement("button");
      var buttonHandle = document.createElement("button");
      var buttonGroup = document.createElement("div");
      widget.el = document.createElement("div");
      widget.elContent = document.createElement("div");
      buttonGroup.className="btn-widget-group";
      buttonClose.addEventListener("click", widget.remove);
      buttonClose.className="btn-circle btn-widget btn-widget-right";
      buttonHandle.className="btn-circle btn-widget btn-widget-left handle";
      buttonClose.innerText = "x";
      buttonHandle.innerText = "+";
      widget.elContent.className="grid-item--content shadow";
      widget.el.className = "noselect grid-item";
      widget.setSize(
        widget.config.height,
        widget.config.width
      );
      buttonGroup.appendChild(buttonClose);
      buttonGroup.appendChild(buttonHandle);
      widget.el.appendChild(buttonGroup);
      widget.el.appendChild(widget.elContent);
      dashboard.elGrid.appendChild(widget.el);
      dashboard.packery.appended(widget.el);
      var itDg = new dashboard.modules.draggabilly( widget.el , {handle:".handle"} );
      dashboard.packery.bindDraggabillyEvents( itDg , {});
      widget.config.draggie = itDg;
      widget.onAdd();
    };

  widget.updateDataFromAttribute = function(){
    var d = mx.helpers.path(config,"view.data.attribute.table");
    widget.setData( d || []);
  };

  widget.updateDataFromLayerClick = function(e){
     updateDataFromLayers(e,true);
  };

 widget.updateDataFromLayerRender = function(e){
     updateDataFromLayers(e,false);
  };

  widget.setUpdateDataMethod = function(){
    var map = widget.config.map;
    var update;

    switch(widget.config.source){
      case "none":
        widget.setData([]);
        break;
      case "viewFreqTable":
        widget.updateDataFromAttribute();
        break;
      case "layerChange":
        update = widget.updateDataFromLayerRender;
        map.on('render',update);
        widget._removeMapListener = function(){map.off('render',update);};
        break;
      case "layerClick":
        setClickIgnore(true);
        update = widget.updateDataFromLayerClick;
        map.on('click',update);
        widget._removeMapListener = function(){
          setClickIgnore(false);
          map.off('click',update);
        };
    }
  };

  function setClickIgnore(enable){
    var widgets = mx.settings.clickIgnoreWidgets; 
    var idWidget =  widget.id;
    var posWidget =  widgets.indexOf(idWidget);
    var hasWidget = posWidget > -1; 
    var toAdd = enable && !hasWidget;
    var toRemove = !enable && hasWidget;

    if( toAdd ){
      widgets.push(idWidget);
    }

    if( toRemove ){
      widgets.splice(posWidget,1);
    } 
  }

  /**
  * Data from layers
  * @param {Object} e Event
  * @param {Boolean} useCoord : use coords instead of event
  */
  function updateDataFromLayers(e,useCoord){
    if( ! useCoord ) e = null;
    mx.helpers.getRenderedLayersData({
      id : widget.config.map,
      point : useCoord ? e.point : undefined,
      idLayer : widget.config.view.id
    }).then(function(data){
      widget.setData(data);
    });
  }




  /*
   * Set dim + adding gutter size
   * @param {Number} size size
   * @param {Number} sizeGrid width/height of grid
   * @param {Number} sizeGutter gutter width
   */
  function sizeWithGutter(size,sizeGrid,sizeGutter){
    var s = size*1||100;
    var gu = sizeGutter/2 || 5;
    var gr = sizeGrid*1 || 50;
    return s + ((s / gr) * gu)-gu ;
  }

  /**
   * Backward compability for classes 
   */
  function toDim(dim){

    var oldClasses = {
      "x50":50,
      "x1":150,
      "x2":300,
      "x3":450,
      "x4":600,
      "y50":50,
      "y1":150,
      "y2":300,
      "y3":450,
      "y4":600         
    };

    return dim*1?dim:oldClasses[dim]||100;
  }

  widget.setSize = function(height,width){
    var h = toDim(height);
    var w = toDim(width);
    this.el.style.width = sizeWithGutter(w) + "px";
    this.el.style.height = sizeWithGutter(h) + "px";
  };

  widget.hide = function(){
    dashboard.packery
      .remove(widget.el);
    //widget.el.classList.add("mx-hide");
    widget.visible = true;
  };

  widget.show = function(){
    dashboard.packery
      .add(widget.el);
    //widget.el.classList.remove("mx-hide");
    widget.visible = true;
  };

  widget.remove = function() {
    /*
     * Exec widget on remove
     */
    widget.onRemove();

    /**
     * Remove timers if any
     */
    if( widget.timer ) {
      window.clearInterval(widget.timer);
      window.clearTimeout(widget.timer);
    }

    if( widget._removeMapListener instanceof Function ) {
        widget._removeMapListener();
    }
    /**
     * Register a unique event
     */
    dashboard.packery
      .once("removeComplete",function(){
        /*
         * Remove from widget store
         */
        var  pos = dashboard.widgets.indexOf(widget);
        if( pos >- 1){
          dashboard.widgets.splice(pos,1);
        }
        setClickIgnore(false);

        /**
         * If this is the last one, destroy the dashboard;
         */
        if(dashboard.widgets.length === 0){
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
    dashboard.packery
      .shiftLayout();

  };

  widget.setContent = function(c) {
    c = c || "<p> content for widget" +
      widget.id +
      " </p>";
    widget.elContent.innerHTML = c;
  };


  widget.setData = function(d) {
    if( widget.data !== d && d instanceof Array && d.length > 0 ) {
      widget.data = d;
      widget.onData();
    }
  };

  widget.strToObj = function(str) {

    return new Promise(function(resolve, reject) {
      var r = function(){};
      if(str) r = new Function(str)();
      if (r) {
        resolve(r);
      } else {
        reject(Error("strToObj failed. Script = " + str));
      }
    });
  };

  widget.randomValue = function(from, to) {
    from = from || 0;
    to = to || 100;
    return from + Math.round(Math.random() * (to - from));
  };

  widget.randomData = function(){
    var a = [];
    var n = widget.randomValue(3,10);
    for(var i = 0;i<n;i++){
      var d = widget.randomValue(3,10);
      a.push({y:d,name:n+""});
    }
    return a;
  };

  widget.randomChart =  function(el){
    var hc = Highcharts ;
    // Build the chart
    el.chart = hc.chart(el, {
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: ['pie','bar','line'][Math.round(Math.random()*2)]
      },
      credits: {
        text: 'map-x',
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
      series: [{
        name: 'Test',
        colorByPoint: true,
        data: randomData()
      }]
    });
  };

  return widget.init(config);
};



/**
* Add and configure a dashboard
* @param {Object} o Options 
* @param {String} o.id Map id
* @param {String} o.idDashboard dashboard id
* @param {Object} o.view View object
* @param {Object} o.data Dashboard data. Default is view.data.dashboard
*/
Dashboard.init = function(o){

  var view = o.view;
  var idDashboard = o.idDashboard || 'mx-dashboard-' + mx.helpers.makeId();
  var idContainer =  o.idContainer ||  mx.settings.idDashboards;
  var dashboardData = o.data || mx.helpers.path(view,"data.dashboard");

  if( !dashboardData || ! dashboardData.widgets ) return;
  if( view._dashboard ) view._dashboard.destroy();

  new Dashboard(idContainer, idDashboard, view)
    .then(function(dashboard){
      /**
       * Keep a ref to the dashboard in view
       */
      view._dashboard = dashboard;

      view._onRemoveDashboard =  function(){
        if(view._dashboard && view._dashboard.destroy instanceof Function){
          view._dashboard.destroy();
        }
      };

      /** 
       * Add widgets
       */
      return dashboardData.widgets.map(function(w){


        var config = {
          dashboard : dashboard,
          source: w.source,
          height: w.height,
          width: w.width,
          script: w.script,
          map: mx.helpers.getMap(o.idMap),
          packery: dashboard.packery,
          view: view
        };

        return new dashboard.Widget(config);

      });


    })
    .catch(e => {
      throw new Error(e);
    })

};

Dashboard.getStore = function(){
  if(mx.dashboards){
    return mx.dashboards;
  }else{
    window.dashboards = [];
    return window.dashboards;
  }
};

Dashboard.hasWidgets = function(){
  return Dashboard.getStore().map(d => d.widgets).length > 0;
};

Dashboard.hasWidgetsVisibles = function(){
  return Dashboard.getStore().map( d => { 
    d.widgets.filter( w => w.visible === true );
  })
    .reduce((all,widget) => {
      all.concat(widget);
    })
    .length > 0;
};

Dashboard.hasDashboards = function(){
  return Dashboard.getStore().length > 0; 
};

Dashboard.hasDashboardsVisible = function(){
  return Dashboard.getStore().filter(d => d.visible === true).length > 0;
};

Dashboard.hideAllDashboards = function(){
  Dashboard.getStore().forEach(d => d.hide());
};
Dashboard.removeAllDashboards = function(){
  Dashboard.showPanel(false);
  Dashboard.getStore().forEach(d => d.destroy());
};

Dashboard.showAllDashboards = function(){
  Dashboard.showPanel(true);
  Dashboard.getStore().forEach(d => d.show());
};

Dashboard.togglAllDashboards = function(){
  if(Dashboard.hasDashboardsVisible()){
    Dashboard.hideAllDashboards();
  }else{
    Dashboard.showAllDashboards();
  }
};

Dashboard.showPanel = function(enable,id){
  var classEnable = 'enabled';
  var toggle = enable == 'toggle';
  var elPanel = document.getElementById( id || mx.settings.idDashboardsPanel );
  
  if(!elPanel) return;

  if( toggle ){
    elPanel.classList.toggle(classEnable);
  }else if( enable ){
    elPanel.classList.add(classEnable);
  }else{
    elPanel.classList.remove(classEnable);
  }

  return !! elPanel.classList.contains(classEnable);

};




