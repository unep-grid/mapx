/* jshint esversion:6, evil: true */

/**
* Add and configure a dashboard
* @param {Object} o Options 
* @param {String} o.id Map id
* @param {Object} o.view View object
*/
export function makeDashboard(o){

  var view = o.view;
  var dashboardData = mx.helpers.path(view,"data.dashboard");

  if( !dashboardData || ! dashboardData.widgets ) return;
  if( view._dashboard ) view._dashboard.destroy();

  new Dashboard("mxDashboards",view)
    .then(function(dashboard){

      dashboardData.widgets.forEach(function(w){

        var config = {
          source: w.source,
          height: w.height,
          width: w.width,
          script: w.script,
          map: mx.maps[o.idMap].map,
          packery:dashboard.packery,
          view: view
        };

        var widget = new dashboard.Widget(config);

      });

      view._dashboard = dashboard;

      view._onRemoveDashboard =  function(){
        if(view._dashboard && view._dashboard.destroy instanceof Function){
          view._dashboard.destroy();
        }
      };

    });

}

/**
* Quick check NOTE: Implement this as methods.
*/
function hasWidgets(){
  return document.querySelectorAll(".grid-item").length > 0;
}
function hasDashboards(){
  return document.querySelectorAll(".mx-dashboard").length > 0;
}
function hasDashboardsVisible(){
  var res = false;
  var d = document.querySelector(".mx-panel-dashboards");
  if( d ){ 
    res = hasDashboards() && d.classList.contains("enabled");
  }
  return(res);
}
function hideDashboards(){
  var d = document.querySelector(".mx-panel-dashboards");
  d.classList.remove("enabled");
}
function showDashboards(){
  var d = document.querySelector(".mx-panel-dashboards");
  d.classList.add("enabled");
}
function autoShowDashboards(){
  if(hasDashboards()){
    showDashboards();
  }else{
    hideDashboards();
  }
}

/**
* Update existing chart / widget in dashboards
* @param {Object} e Mapboxgl event object
*/
export function handleEvent(e){
    var o = {id:'map_main'};
    var data = [];
    var type = e.type;
    var mxLayers = mx.helpers.getLayerNamesByPrefix({id:o.id,prefix:"MX-",base:true});
    var views = mx.maps[o.id].views;
    var map =  mx.maps[o.id].map;
    var rendered = false;

  if(hasDashboardsVisible()){
    views.forEach(function(v){
      if(v._dashboard){
        var d = v._dashboard.store;
        d.forEach(function(w){
          var idView = mx.helpers.path(w,"config.view.id");
          switch(w.config.source){
            case "layerChange":
              if(type !== "click"){
                mx.helpers.getRenderedLayersData({
                  id:o.id,
                  idLayer: idView
                }).then(function(data){
                  w.setData(data);
                });
              }
              break;
            case "layerClick":
              if(type === "click"){


                mx.helpers.getRenderedLayersData({
                  id : o.id,
                  idLayer : idView,
                  point : e.point
                }).then(function(data){
                  w.setData(data);
                });
                
                rendered = true;
              }
              break;
          }
        });
      }  
    });
  }

    if(!rendered && type === "click"){
      /**
       * Click event : it's a popup.
       */

      var popup = new mx.mapboxgl.Popup()
        .setLngLat(map.unproject(e.point))
        .addTo(map);

      var propsRendered = mx.helpers.featuresToHtml({
        id : o.id,
        point : e.point,
        popup : popup
      });


    }
}


/**
* Create a new dashboard for a given view
* @param {String} idContainer Dashboad container id
* @param {Object} view View object
*/
function Dashboard(idContainer,view) {
  var dashboard = this;
  var modules = mx.helpers.path(view,'data.dashboard.modules')||['highcharts'];

  return  Promise.all([
    System.import("packery"),
    System.import("draggabilly"),
    mx.helpers.modulesLoad(modules)
  ])
    .then(function(m){
      // Access to modules from each dashboard
      dashboard.modules = {};
      dashboard.modules.packery = m[0];
      dashboard.modules.draggabilly = m[1];
     
      modules.forEach((mod,i) => {
        dashboard.modules[mod] = m[2][i];
      });

      dashboard.elContainer = document.getElementById(idContainer);
      dashboard.elGrid = document.createElement("div");
      dashboard.elGrid.className = "grid mx-dashboard";
      dashboard.elContainer.appendChild(dashboard.elGrid);
      dashboard.store = [];

      dashboard.packery = new dashboard.modules.packery( dashboard.elGrid, {
        itemSelector: '.grid-item',
        columnWidth: 50,
        rowHeight: 50,
        gutter : 5,
        transitionDuration: 100,
        stagger : 0
      });

      /**
       * Remove dashboard from the window, delete from view
       */     
      dashboard.remove =  function(){
        dashboard.elGrid.remove();
        dashboard.packery.destroy();
        delete view._dashboard;
        autoShowDashboards();
      };

      /**
       * Destroy dashboard content and/or remove on callback
       */
      dashboard.destroy = function(){
        // loop on stored widgets 
        var w = dashboard.store;        

        if( w.length  === 0 ){
          // remove it now
          dashboard.remove();           
        }else{ 
          // remove all widget first. Remove after "removeComplete" event. See bellow
          for( var i=w.length-1; i>=0; i-- ){
            // remove 
            if(w[i]) w[i].remove();
          }
        }
      };

      /**
      * Widget method
      */ 
      dashboard.Widget = function(config) {
        var widget = this;

        widget.init = function( config ) {
          if(widget._init) return ;

          /*
          * If dashboard is not visible, show it.
          */
          autoShowDashboards();


          /**
           * Eval the script, dump error in console
           */
          widget.strToObj( config.script )
            .then(function(register) {
              for (var r in register) {
                widget[r] = register[r];
              }
            }).then(function() { 
              /**
               * Keep config, modules and set id
               */
              widget.id = config.id || widget.randomValue();
              widget.modules = dashboard.modules;
              widget.config =  config;
              dashboard.store.push(widget);
              widget.add();
              /*
               * Set default data when data is view freq table
               */
              if(config.source === "viewFreqTable"){
                var d = mx.helpers.path(config,"view.data.attribute.table");
                if(d) widget.setData(d);
              }
              /**
               * Set init flag to true
               */
              widget._init = true;
            }).catch(function(e) {

              widget.remove();
            });
        };

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
          //widget.el.appendChild(buttonHandle);
          widget.el.appendChild(widget.elContent);
          dashboard.elGrid.appendChild(widget.el);
          dashboard.packery.appended(widget.el);
          var itDg = new dashboard.modules.draggabilly( widget.el , {handle:".handle"} );
          dashboard.packery.bindDraggabillyEvents( itDg , {});
          widget.config.draggie = itDg;
          widget.onAdd();
        };


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

        widget.remove = function() {
          /**
          * Remove the widget.
          */
          var id = dashboard.store.indexOf(widget);
          if ( id !== -1 ) {
            if( widget.timer ) {
              window.clearInterval(widget.timer);
              window.clearTimeout(widget.timer);
            }
            dashboard.packery
              .once("removeComplete",function(){
                 dashboard.store.splice(id,1);
                 if(dashboard.store.length === 0){
                   dashboard.remove();
                 }
              });

            dashboard.packery
              .remove(widget.el);

            dashboard.packery
              .shiftLayout();

            widget.onRemove();
          }
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

        widget.init(config);

      };
      return dashboard;
    });

}
