/* jshint esversion :6 */

export function GeoCompo(map){
  var gc = this;
  map =  map || mx.maps.map_main.map;
  gc.id = Math.random().toString(36);
  gc.elements = {};
  gc.data = {};
  gc.map = map;
  gc.data.features = [];
  gc.data.contours = [];
  gc.data.dim = {};
  return gc.init();
}

GeoCompo.prototype.init = function(){

  var gc = this;
  var data = gc.data;
  var dim = data.dim;
  var el = gc.elements;

  el.mapContainer = gc.map.getContainer();
  el.canvas = document.createElement("canvas");
  el.canvas.id = gc.id;
  el.canvas.style = "pointer-events:none;width:100%;height:100%;position:absolute;top:0;left:0;";
  el.mapContainer.appendChild(el.canvas);

  /**
   * scale and bounds updated on geojson add
   */
  dim.scaleCanvas = 0;
  dim.bounds = {
    maxLat : -90,
    maxLng : -180,
    minLat : 90,
    minLng : 180
  };
  dim.topLeft = {x:0,y:0};
  dim.bottomRight = {x:0,y:0};

    /**
     * Set container dim
     */
  dim.widthBase = el.canvas.clientWidth ;
  dim.heightBase = el.canvas.clientHeight ;
 
};

GeoCompo.prototype.program = function(arrayProgram){
  var gc = this;
  var waitList = [];
  
  arrayProgram.forEach(function(prog){
    for(var f in prog ){
      if( f!= "init" ){
        waitList.push(prom(f,prog));
      }
    }
  });

  function prom(f,prog){
    var out;
    return new Promise(function(resolve,reject){
      out = gc[f](prog[f]);
      resolve(out);
    });
  }

  return Promise.all(waitList);

};



GeoCompo.prototype.getRenderedFeatures = function(config){

  return  Promise.all([
    System.import("@turf/helpers"),
    System.import("@turf/flatten"),
    System.import("@turf/buffer")
  ])
    .then(m => {

     var helpers = m[0];
     var flatten = m[1].default;
     var buffer = m[2].default;

      config = config || {};
      var configDefault = {
        prefix : 'MX-',
        groupSeparator : '@',
        idMap : 'map_main'
      };

      var gc = this;

      /**
       * All group name
       */
      var groups = mx.helpers.getLayerNamesByPrefix({
        id: config.idMap || configDefault.idMap,
        prefix: config.prefix || configDefault.prefix,
        base : true
      });

      groups.forEach(function(l){
        var layers = [];
        var featuresQuery = [];
        var features = [];

        /**
         * All layer in group
         */
        layers = mx.helpers.getLayerNamesByPrefix({
          id : config.idMap || configDefault.idMap,
          prefix : l
        });
        featuresQuery = gc.map.queryRenderedFeatures({
          layers : layers
        });

        features = featuresQuery.map( f => {
          var type = f.geometry.type ;
          if( type.indexOf('Line') > -1 || type.indexOf('Point') > -1){
             f = buffer(f,1);
          }
          return {
            type: 'Feature',
            geometry: f.geometry,
            properties: { id: l }
          };
        });

        features = flatten(helpers.featureCollection(features));
        gc.data.features.push(features);

      });


    });
};


/*
* Get mapbox gl bounds
*/
GeoCompo.prototype.getMapBounds = function(){
  var gc = this;
  if(gc.map){
    var bounds = gc.map.getBounds();
    return {
      maxLat : bounds.getNorth(),
      maxLng : bounds.getEast(),
      minLat : bounds.getSouth(),
      minLng : bounds.getWest()
    };
  }else{
    return gc.data.dim.bounds;
  }
};

/**
* Add a featureCollection to the stack, set the draw function
*/
GeoCompo.prototype.buildDrawFunction = function(){

  var gc = this;

  return new Promise(function(resolve,reject){

    var features = gc.data.features;


    var d = gc.data.dim;
    var point;

    features.forEach( geojson => {

      /**
       * Actual drawing function. Store it in layer for later use.
       */
      geojson.draw = function(){

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
    });
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
  gc.data = {};
  gc.data.features = [];
  gc.data.contours = [];
  gc.data.dim = {};

  if(gc.context) gc.context.clearRect(0,0,gc.data.dim.widthBase,gc.data.dim.heightBase);
  return(gc);
};

/*
* Render the stack
* @param {String} method method used in globalCompositeOperation
* @return {Promise} 
*/
GeoCompo.prototype.render = function(method){
  var gc = this;
  var dim = gc.data.dim;
  var elCanvas = gc.elements.canvas;
  var context = elCanvas.getContext('2d');
  context.clearRect(0,0,dim.widthBase,dim.heightBase);
  context.globalCompositeOperation = "copy";

  return new Promise(function(resolve, reject){

    gc.start = performance.now();

    gc.data.features.forEach((layer) => {
      var layerCanvas = layer.draw();
      context.drawImage(layerCanvas,0,0);
      context.globalCompositeOperation = method || "copy";
    });

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
    x : ( point.x / gc.data.dim.scaleCanvas ) + gc.data.dim.topLeft.x,
    y : gc.data.dim.topLeft.y - ( point.y / gc.data.dim.scaleCanvas )
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
  out.x = (point.x - gc.data.dim.topLeft.x) * gc.data.dim.scaleCanvas ;
  out.y = (gc.data.dim.topLeft.y - point.y) * gc.data.dim.scaleCanvas ;
  return out;
};


GeoCompo.prototype.getCanvasBounds = function(){
  var gc = this;
  var out = {};

  var southEast = gc.pointToCoord({
     x : gc.data.dim.widthBase,
     y : gc.data.dim.heightBase
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
  var dim = gc.data.dim;
  var bounds = dim.bounds;
  var stack = gc.data.features;
  var layer ;
  var lat;
  var lng;
  var minLat = dim.bounds.minLat || 90;
  var maxLat = dim.bounds.maxLat || -90;
  var minLng = dim.bounds.minLng || 180;
  var maxLng = dim.bounds.maxLng || -180;


  function update(lngLat){
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
  }

  stack.forEach( layer => {
    gc.coordForEach(layer,{
        onCoord : update
      }); 
  });

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
  return gc.data.dim.bounds;
};

GeoCompo.prototype.trace = function(){
    
  var gc = this;
  
  Promise.all([
    System.import("d3-contour"),
    Syetem.import("@turf/helpers")
  ])
    .then(function(m){
      var d3 = m[1];
      var h = m[0];

      return new Promise(function(resolve,reject){
        var scale = gc.data.dim.scaleCanvas;
        var features = [];
        var contour,contours, points, coord, coordFirst,path,c, k, kL, p, n, i, iL, j, jL,l,lL;
        var geojson;
        var pixels = gc.context.getImageData(0,0,gc.data.dim.widthBase,gc.data.dim.heightBase).data;
        var values = [];

        for (i = 0,  n = pixels.length; i < n; i += 4) {
          values.push(pixels[i+3]);
        }

        contours = d3.contours()
          .size([gc.data.dim.widthBase, gc.data.dim.heightBase])
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
                x : ( coord[0] / scale ) + gc.data.dim.topLeft.x,
                y : gc.data.dim.topLeft.y - ( coord[1] / scale )
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

