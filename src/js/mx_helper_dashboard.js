/*jshint esversion:6*/



/**
* Init dashboard
* @param {Object} o Options
* @param {String} o.id map id 
* @param {String} o.idDashboard id of the dashboard default mxDashboard
* @param {Sting} o.content text
*/
export function initDashboard(o){

  if(typeof o == "undefined") o = {};

  return System.import("packery").then(function(pk){

    if(!mx.packery){
    var dash = document.getElementById(o.idDashboard||"mxDashboard");

    mx.packery = new pk( dash, {
      itemSelector: '.grid-item',
      columnWidth: 150,
      percentPosition: true,
      initLayout: true,
      isHorizontal: true
    });
    }
    return(mx.packery);

  });

}

/**
*  Add widget
* @param {Object} o Options
* @param {String} o.id map id 
* @param {String} o.idDashboard id of the dashboard default mxDashboard
* @param {Sting} o.content text
* @param {Number} o.y width
* @param {Number} o.x height
*/
export function addWidget(o){
  if(typeof o == "undefined") o = {};

  mx.helpers.initDashboard(o).then(function(pk){
      System.import("draggabilly")
      .then(function(dg){
        var x = o.x||1;
        var y = o.y||1;
        var dash = document.getElementById(o.idDashboard||"mxDashboard");
        var it = document.createElement("div");
        var itContent = document.createElement("div");
        var buttonClose = document.createElement("button");
        var buttonHandle = document.createElement("button");
        buttonClose.innerText="x";
        buttonHandle.innerText="+";
        buttonClose.onclick=function(){
          pk.remove(it);
          pk.shiftLayout();
        };
        buttonClose.className="btn-circle btn-circle--right";
        buttonHandle.className="btn-circle btn-circle--left handle";
        it.className= "grid-item "+" x"+x+" y"+y;
        itContent.className="grid-item--content";
        it.appendChild(buttonHandle);
        it.appendChild(buttonClose);
        it.appendChild(itContent);
        dash.appendChild(it);
        pk.appended(it);
        var itDg = new dg( it , {handle:".handle"} );
        pk.bindDraggabillyEvents( itDg , {});
        randomChart(itContent);
      });
  });
}

  function randomData(){
    var a = [];
    var n = Math.floor(Math.random()*10)+3;
    for(var i = 0;i<n;i++){
      var d = (Math.random()*100)/n;
      var e = Math.round(d);
      a.push({y:d,name:e});
    }
    return a;
  }
  
  function randomChart(el){
    System.import("highcharts").then(function(hc){
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
            text: 'TEST TEST TEST'
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
    });
  }
