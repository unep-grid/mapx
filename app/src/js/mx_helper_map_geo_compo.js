/* jshint esversion :6 */
import * as helpers from "@turf/helpers";

//import {MSQR} from "msqr";
export function GeoCompo(conf){
  this.config = conf || {};
  this.update();
}

GeoCompo.prototype.update = function(){
  var gc = this;
  return new Promise(function(resolve,reject){

    var def = {
      width : 800,
      height : 600
    };

    /**
     * Init gc
     */
    gc.stack = [];
    gc.contours = [];
    gc.config = Object.assign(def,gc.config);
    gc.dim = {};
    var c = gc.config;
    var d = gc.dim;

    /**
     * scale and bounds updated on geojson add
     */
    d.scaleCanvas = 0;
    d.bounds = {
      maxLat : -90,
      maxLng : -180,
      minLat : 90,
      minLng : 180
    };
    d.topLeft = {x:0,y:0};
    d.bottomRight = {x:0,y:0};

    /**
     * Set container dim
     */
    d.widthBase = c.el ? c.el.clientWidth : c.width ? c.width : 1000 ;
    d.heightBase = c.el ? c.el.clientHeight : c.height ? c.height : 1000 ;
 
    if(c.program){
    var waitList = [];
      c.program.forEach(function(prog){
        for(var f in prog ){
          if(f!="init"){
            waitList.push(gc[f](prog[f])); 
          }
        }     
      });

      resolve(Promise.all(waitList));
    }else{

      resolve(gc);

    }

  });
};

/*
* Get mapbox gl bounds
*/
GeoCompo.prototype.getMapBounds = function(){
  var gc = this;
  if(gc.config.map){
    var bounds = gc.config.map.getBounds();
    return {
      maxLat : bounds.getNorth(),
      maxLng : bounds.getEast(),
      minLat : bounds.getSouth(),
      minLng : bounds.getWest()
    };
  }else{
    return gc.dim.bounds;
  }
};

/**
* Add a featureCollection to the stack, set the draw function
*/
GeoCompo.prototype.addGeojson = function(geojson){

  var gc = this;

  return new Promise(function(resolve,reject){

    geojson = geojson instanceof Array ? geojson:[geojson];
    var d = gc.dim;
    var c = gc.config;
    var point;
    var layer = {
      geojson : geojson
    };
    gc.stack.push(layer);

    /**
    * Actual drawing function. Store it in layer for later use.
    */
    layer.draw = function(){

      gc.updateBounds(geojson);
      var canvas = gc.makeCanvas(d.widthBase,d.heightBase);
      var context = canvas.getContext('2d');

      gc.coordForEach(geojson,{
        onFeatureStart : function(feature){
          context.lineWidth = 1;
          context.fillStyle = '#F00';
          context.strokeStyle = '#F00';
          context.beginPath();
        },
        onCoord : function(coord,index,type){

          point = gc.coordToPoint(coord[0], coord[1]);

          if ( index === 0) {
            context.moveTo(point.x, point.y);
          } else {
            context.lineTo(point.x, point.y);
          }
        },
        onFeatureEnd :  function(feature){
          context.fill();
          context.stroke();
        }
      });

      return canvas;
    };

    resolve(gc);
  });
};

/**
* Add an array of geojson
*/
GeoCompo.prototype.addGeojsonArray = function(arrayGeojson){
  var gc = this;
  var waitList = [];
  for( var i=0, iL=arrayGeojson.length; i<iL; i++ ){
    waitList.push(gc.addGeojson(arrayGeojson[i]));
  }

  return Promise.all(waitList);
};

/**
* Apply a callback in gc
*/
GeoCompo.prototype.callback = function(fun){
  var gc = this;
  return Promise.resolve(fun(gc));
};

/**
* 
*/
GeoCompo.prototype.clear = function(){
  var gc = this;
  gc.stack = [];
  gc.contours = [];
  if(gc.context) gc.context.clearRect(0,0,gc.dim.widthBase,gc.dim.heightBase);
  return(gc);
};

/*
* Render the stack
* @param {String} method method used in globalCompositeOperation
* @return {Promise} 
*/
GeoCompo.prototype.render = function(method){
  var gc = this;
  var d = gc.dim;
  var elContainer = gc.config.el;

  return new Promise(function(resolve, reject){

    gc.start = performance.now();
    gc.canvas = gc.makeCanvas(d.widthBase,d.heightBase);
    gc.context = gc.canvas.getContext('2d');

    for(var i=0,iL=gc.stack.length; i<iL ; i++){
      var a = i;
      if( gc.config.reverse ) a = iL-i;
      var layer = gc.stack[a];
      var layerCanvas = layer.draw();
      gc.context.drawImage(layerCanvas,0,0);
      gc.context.globalCompositeOperation = method || gc.config.method || "copy";
    }

    if(elContainer instanceof Node){
      var oldCanvas = elContainer.querySelector("canvas");
      if(oldCanvas){
        var oldContext = oldCanvas.getContext("2d");
        oldContext.clearRect(0,0,oldCanvas.width,oldCanvas.height);
        oldContext.drawImage(gc.canvas,0,0);
        oldContext.globalCompositeOperation = "copy";
      }else{
        elContainer.appendChild(gc.canvas);
      }
    }
    console.log("Rendered in" + (performance.now() - gc.start));
    resolve(gc);

  });
};


/**
* HELPERS
*/


GeoCompo.prototype.pointToCoord = function(point){
  var gc = this;
  return gc.metersToDegrees({
    x : ( point.x / gc.dim.scaleCanvas ) + gc.dim.topLeft.x,
    y : gc.dim.topLeft.y - ( point.y / gc.dim.scaleCanvas )
  });
};

GeoCompo.prototype.coordToPoint = function(lng,lat){
  var gc = this;
  var point = gc.degreesToMeters(lng, lat);  
  point = gc.pointScale(point);
  return point;
};

GeoCompo.prototype.pointScale = function(point){
  var gc = this;
  var out = {};
  out.x = (point.x - gc.dim.topLeft.x) * gc.dim.scaleCanvas ;
  out.y = (gc.dim.topLeft.y - point.y) * gc.dim.scaleCanvas ;
  return out;
};


GeoCompo.prototype.getCanvasBounds = function(){
  var gc = this;
  var out = {};

  var southEast = gc.pointToCoord({
     x : gc.dim.widthBase,
     y : gc.dim.heightBase
  });

  var northWest = gc.pointToCoord({
    x: 0,
    y: 0
  });

  out = {
    minLat : southEast.lat,
    maxLat : northWest.lat,
    minLng : northWest.lng,
    maxLng : southEast.lng
  };

  return out;
};

GeoCompo.prototype.makeCanvas = function(width,height,el){
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = 'absolute';
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.height = "100%";
  canvas.style.width = "100%";
  return canvas;
};

GeoCompo.prototype.degreesToMeters = function(lon,lat) {
  var x = lon * 20037508.34 / 180;
  var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  return {
    x : x,
    y : y
  };
};

GeoCompo.prototype.metersToDegrees = function(point) {
  var lng = point.x *  180 / 20037508.34 ;
  var lat = Math.atan(Math.exp(point.y * Math.PI / 20037508.34)) * 360 / Math.PI - 90; 
  return {
    lat : lat,
    lng : lng
  };
};

GeoCompo.prototype.coordForEach = function(geojson,options){
  var g, gL, i, iL, j, jL, c, cL, gj;
  var coord, coords, type, point;
  var o = options;
  if(o.onStart) o.onStart(geojson);

  for (g = 0, gL = geojson.length; g < gL; g++){
    gj = geojson[g];
    for ( i = 0, iL = gj.features.length; i < iL; i++) {
      type = gj.features[i].geometry.type;
      coords = gj.features[i].geometry.coordinates[0];

      /**
       * On feature
       */
      if(o.onFeatureStart) o.onFeatureStart(gj.features[i]);

      if(type.indexOf("Multi") === -1) coords = [coords];
      for ( c = 0, cL = coords.length; c < cL ; c++){
        coord = coords[c];  
        for ( j = 0,jL = coord.length; j < jL; j++) {

          /**
           * For each coord
           */
          if(o.onCoord) o.onCoord(coord[j],j,type);

        }
      }

      /**
       * On feature end
       */
      if(o.onFeatureEnd) o.onFeatureEnd(gj.features[i]);
    }
  }
  if(o.onEnd) o.onEnd();

};


GeoCompo.prototype.updateBounds = function(geojson){

  var start = performance.now();
  var gc = this;
  var dim = gc.dim;
  var bounds = dim.bounds;
  var stack = gc.stack;
  var layer ;
  var lat;
  var lng;
  var minLat = dim.bounds.minLat || 90;
  var maxLat = dim.bounds.maxLat || -90;
  var minLng = dim.bounds.minLng || 180;
  var maxLng = dim.bounds.maxLng || -180;


  var updateBounds =  function(lngLat){
    lat = lngLat[1];
    lng = lngLat[0];
   
    if( lat > -90 && lat < 90 ) {
      if( lat < minLat) minLat = lat; 
      if( lat > maxLat) maxLat = lat; 
    }
    if( lng >= -180 && lat <= 180 ) {
      if( lng < minLng ) minLng = lng; 
      if( lng > maxLng ) maxLng = lng; 
    }
  };

  for(var i=0, iL=gc.stack.length; i<iL; i++){
    layer = stack[i];
    if(layer.geojson){
      gc.coordForEach(layer.geojson,{
        onCoord : updateBounds
      });
    }
  }

  /**
  * Limit to map bounds if provided
  */
  var mapBounds = gc.getMapBounds();
  if( mapBounds ){
    if( minLat && minLat < mapBounds.minLat ) minLat = mapBounds.minLat;
    if( minLng && minLng < mapBounds.minLng ) minLng = mapBounds.minLng;
    if( maxLat && maxLat < mapBounds.maxLat ) maxLat = mapBounds.maxLat;
    if( maxLng && maxLng < mapBounds.maxLng ) maxLng = mapBounds.maxLng;
  }


 if(minLat) bounds.minLat = minLat; 
 if(minLng) bounds.minLng = minLng; 
 if(maxLat) bounds.maxLat = maxLat;
 if(maxLng) bounds.maxLng = maxLng;

  dim.topLeft = gc.degreesToMeters(bounds.minLng,bounds.maxLat);
  dim.bottomRight = gc.degreesToMeters(bounds.maxLng,bounds.minLat);

  dim.world = {
    x : Math.abs(dim.bottomRight.x - dim.topLeft.x),
    y : Math.abs(dim.bottomRight.y - dim.topLeft.y)
  };

  dim.scale = {
    y : dim.heightBase / dim.world.y,
    x : dim.widthBase / dim.world.x
  };

  dim.scaleCanvas = dim.scale.x < dim.scale.y ? dim.scale.x : dim.scale.y;

};

GeoCompo.prototype.getDataBounds =  function(){
  var gc = this;
  return gc.dim.bounds;
};

GeoCompo.prototype.trace = function(){
    
  var gc = this;
  return import("d3-contour").then(function(d3){

    return new Promise(function(resolve,reject){
      var scale = gc.dim.scaleCanvas;
      var features = [];
      var contour,contours, points, coord, coordFirst,path,c, k, kL, p, n, i, iL, j, jL,l,lL;
      var geojson;
      var pixels = gc.context.getImageData(0,0,gc.dim.widthBase,gc.dim.heightBase).data;
      var values = [];
      var h = helpers;

      for (i = 0,  n = pixels.length; i < n; i += 4) {
        values.push(pixels[i+3]);
      }

      contours = d3.contours()
        .size([gc.dim.widthBase, gc.dim.heightBase])
        .thresholds([0,255])
      (values);


      contour = contours[1].coordinates;

      points = [];
      for(j=0,jL=contour.length;j<jL;j++){
        path = contour[j];
        if(!(path instanceof Array)) path = [path];
        for(k=0,kL=path.length;k<kL;k++){
          p = path[k];
          for(l=0,lL=p.length;l<lL;l++){
            coord = p[l];

            c = gc.metersToDegrees({
              x : ( coord[0] / scale ) + gc.dim.topLeft.x,
              y : gc.dim.topLeft.y - ( coord[1] / scale )
            });

            coord[0] = c.lng;
            coord[1] = c.lat;
          }
        }
      }

      gc.contours = contours;

      resolve(gc);
    });
  });
};

GeoCompo.prototype.simplify = function(){
 var gc = this;
  return new Promise(function(resolve,reject){
  
  
  });
};
