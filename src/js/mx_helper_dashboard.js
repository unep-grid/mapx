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
          map: mx.maps[o.id],
          view: view
        };

        var widget = new dashboard.Widget(config);

      });

      view._dashboard = dashboard;

    });

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

  return  Promise.all([
    System.import("packery"),
    System.import("draggabilly"),
    System.import("./mx_highcharts.js")
  ])
    .then(function(m){
      // Access to modules from each dashboard
      dashboard.modules = {};
      dashboard.modules.packery = m[0];
      dashboard.modules.draggabilly = m[1];
      dashboard.modules.highcharts= m[2].Highcharts;
      dashboard.elContainer = document.getElementById(idContainer);
      dashboard.el = document.createElement("div");
      dashboard.el.className="mx-dashboard grid";
      dashboard.elContainer.appendChild(dashboard.el);
      dashboard.store = [];

      dashboard.packery = new dashboard.modules.packery( dashboard.el, {
        itemSelector: '.grid-item',
        //columnWidth: 150,
        columnWidth: 50,
        rowHeight: 50,
        gutter : 5
      });

      dashboard.destroy = function(){
        dashboard.store.forEach(function(w){
          dashboard.packery.remove(w.el);
        });
        
        dashboard.el.remove();
        dashboard.packery.destroy();
        delete view._dashboard;
      };

      dashboard.Widget = function(config) {
        var widget = this;

        widget.init = function( config ) {
          if(widget._init) return ;

          /**
           * Read the script, dump error in console
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
              widget.id = widget.randomValue();
              widget.modules = dashboard.modules;
              widget.config =  config;
              dashboard.store.push(widget);
              widget.add();
              /*
               * Set default data when data is view freq table
               */
              if(config.source === "viewFreqTable"){
                var d = mx.helpers.path(config,"view.data.attribute.table");
                widget.setData(d);
              }
              /**
               * Set init flag to true
               */
              widget._init = true;
            }).catch(function(e) {

              widget.remove();
              console.log(e);
            });
        };

        widget.add = function() {
          var buttonClose = document.createElement("button");
          var buttonHandle = document.createElement("button");
          widget.el = document.createElement("div");
          widget.elContent = document.createElement("div");

          buttonClose.addEventListener("click", widget.hide);
          buttonClose.className="btn-circle btn-circle--right";
          buttonHandle.className="btn-circle btn-circle--left handle";
          buttonClose.innerText = "x";
          buttonHandle.innerText = "+";
          widget.elContent.className="grid-item--content shadow";
          widget.el.className =
            "noselect grid-item"+" " + (widget.config.width || 1) +
            " " + (widget.config.height || 1);
          widget.el.appendChild(buttonClose);
          widget.el.appendChild(buttonHandle);
          widget.el.appendChild(widget.elContent);
          dashboard.el.appendChild(widget.el);
          dashboard.packery.appended(widget.el);
          var itDg = new dashboard.modules.draggabilly( widget.el , {handle:".handle"} );
          dashboard.packery.bindDraggabillyEvents( itDg , {});
          widget.onAdd();
        };

        widget.remove = function() {
          var id = dashboard.store.indexOf(widget);
          if (id > -1) {
            dashboard.packery.remove(widget.el);
            dashboard.packery.shiftLayout();
            dashboard.store.splice(id, 1);
            widget.onRemove();
          }
          if(dashboard.store.length == 0){
            dashboard.destroy();
          }
        };

        widget.hide = function(){
          widget.el.classList.add("mx-hide");
        };

        widget.show = function(){
          widget.el.classList.remove("mx-hide");
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
            var r = new Function(str)();
            if (r) {
              resolve(r);
            } else {
              reject(Error("strToObj failed. Script = " + str));
            }
          });
        };

        /*widget.getData = function() {*/
          //var data;
          //switch (widget.config.source) {
            //case "view":
              //data = widget.config.view.data.attribute.table;
              //break;
            //case "static":

              //break;
            //case "map":
              //data = widget.randomData(2);
              //break;

            //default:

              //data = data;

          //}
          //widget.setData(data);
        //};

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
