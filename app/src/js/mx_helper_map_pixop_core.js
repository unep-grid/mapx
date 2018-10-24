/* jshint esversion :6 */

export function PixOp(config){
"use strict";

  if (this instanceof PixOp) {
    var px = this;
    config = config || {};
    px.debug = !! config.debug || false ;
    px.timing = {};
    px.data = px.getDefault('data');
    px.canvas = null;
    px.sources = px.getDefault('sources');
    px.opt = px.getDefault('render_options'); 
    px.config = config;
    px.result = {};
    px.bounds = [];
    px.initConfig();
    px.initCanvasSource();

    px._cache = {
      map_zoom : 0,
      circles : {}
    };


  }
  else return new PixOp(config);
}

PixOp.prototype.render = function(opt){

  var px = this;
  var res = {};
  var map = px.map;
  opt = opt || {};
  render();

  function render(){

    px._timing('render','start',true);

    px.reset()
      .updateRenderOptions(opt)
      .updateMapParams()
      .updateFeatures()
      .layersToPixelsStore()
      .renderMethod();

    if(opt.canvas.add){
      px.refresh();
    }

    px._timing('render','stop');

  }

};


PixOp.prototype.getDefault = function(type){

  var def = {
    /**
     * Store mapbox gl sources
     */
    sources : {
      canvas : {}
    },
    /**
     * PixOp rendering option
     */
    render_options : {
      overlap : {
        nLayersOverlap : 2,
        calcArea : false,
        threshold : 127 // antialiasing produce varying alpha band. Which impact overlap analysis.
      },
      type : 'overlap',
      debug : false,
      canvas : {
        scale : 2,
        add : false,  
        lineWidth : 0,
        lineCap : 'round',
        lineJoin : 'round',
        fillColor: '#F00',
        strokeColor : '#F00',
        circleRadius : 100, //meter
        spotlightBuffer : 50
      }
    },
    /**
     * Store features and pixel arrays
     */
    data : {
      features : [],
      pixels : []
    }
  };

  var d = def[type];

  if(!d) throw new Error( type +" not defined as default");

  return JSON.parse(JSON.stringify(d));
};





PixOp.prototype.initConfig = function(){
  var px = this;

  px._timing('init_config','start');

  var configDefault = {
    map :  mx.helpers.getMap(),
    id : 'MX_GC_-' + Math.random().toString(36),
    layer_prefix : 'MX-',
    layer_group_separator : '@'
  };

  Object.keys(configDefault).forEach( i => {
    if(!px.config[i]) px.config[i] = configDefault[i];
  });

  /**
   * shortcut
   */
  px.map = px.config.map;
  px.id = px.config.id;


  px._timing('init_config','stop');
};


PixOp.prototype.initCanvasSource = function(){

  var px = this;
  px._timing('init_canvas','start');
  var idMapCanvas = px.id + '_canvas';
  var map = px.map;
  var canvas = px.makeCanvas({
    id : idMapCanvas,
    width : 10,
    height : 10,
    style : {
      display : 'none'
    }
  });

  document.body.appendChild(canvas);

  var l = {
    id: idMapCanvas,
    source: {
      type: 'canvas',
      canvas : idMapCanvas,
      coordinates: [[0,0],[1,0],[1,-1],[0,-1]],
      animate : false
    },
    type: 'raster',
    paint: {
      'raster-fade-duration' : 0.5,
      'raster-opacity': 0.6
    }
  };

  map.addLayer(l);

  px.canvas  = canvas;
  px.sources.canvas = map.getSource(idMapCanvas);

  px._timing('init_canvas','stop');
};

PixOp.prototype.start = function(opt){
  var px = this;
  return px; 
}; 

PixOp.prototype.updateMapParams = function(){
  var px = this ;
  var opt = px.opt;
  var map = px.map;
  var canvas = px.canvas;
  var src = px.sources.canvas;
  var bounds = px.getMapBounds();
  var topLeft = map.project([bounds.minLng,bounds.maxLat]);
  var bottomRight = map.project([bounds.maxLng,bounds.minLat]);

  px._timing('update_bounds','start');
  canvas.width = opt.canvas.scale * (bottomRight.x - topLeft.x) || 1;
  canvas.height = opt.canvas.scale * (bottomRight.y - topLeft.y) || 1;

  src.setCoordinates([
    [ bounds.minLng, bounds.maxLat ],
    [ bounds.maxLng, bounds.maxLat ],
    [ bounds.maxLng, bounds.minLat ],
    [ bounds.minLng, bounds.minLat ]
  ]);

  px._cache.map_bounds = map.getBounds();
  px._cache.map_style = map.getStyle();
  px._cache.map_zoom = map.getZoom();
  px._timing('update_bounds','stop');
  return px;
};


PixOp.prototype.updateFeatures = function(){
  var px = this;
  px.data.features =  px.getFeatures();
  return px;
};


PixOp.prototype.layersToPixelsStore = function(){

  var px = this;

  var layers = px.data.features;
  var store = px.data.pixels = [];
  var nLayer = layers.length;
  var width = px.canvas.width;
  var height = px.canvas.height;

  px._timing('layers_to_pixels','start');

  for ( var i = 0; i < nLayer; i++ ) { 

    var pixels = px.layerToCanvas(layers[i]) 
      .getContext("2d")
      .getImageData(0,0,width,height)
      .data;

    store.push(pixels);
  }

  px._timing('layers_to_pixels','stop');
  return px;
};

PixOp.prototype.renderMethod = function(){

  var px = this;
  var opt = px.opt;

  switch( opt.type ){
    case 'overlap':
      px._findOverlap();
      break;
    case 'overlap-spotlight':
      px._findOverlapSpotlight();
      break;
  }

  return px;
};


PixOp.prototype.reset = function(){
  var px = this;
  px.data = px.getDefault('data');
  px.opt = px.getDefault('render_options');
  px.clear();
  return px;
};


PixOp.prototype.clearCanvas = function(){
  var px = this;
  var canvas = px.canvas;
  var width = canvas.width;
  var height = canvas.height;
  var ctx = canvas.getContext('2d');
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.restore();
  px.refresh();
  return px;
};


PixOp.prototype.clear = function(){
  var px = this;
  px.clearCanvas();
  return px;
};


PixOp.prototype._findOverlap = function(){

  var px = this;
  var opt = px.opt;
  var canvas = px.canvas;
  var ctx = canvas.getContext("2d");
  var width = canvas.width;
  var height = canvas.height;
  var imageData = ctx.getImageData(0,0,width,height);
  var data = imageData.data;
  var nPix = height * width;
  var i,j,k,x,y;
  var area = 0, count = 0, countAll = 0;
  var store = px.data.pixels;
  var nLayer = store.length;
  var nLayersOverlap = ( opt.overlap.nLayersOverlap * 1 ) || nLayer; // 0 means all
  var calcArea =  opt.overlap.calcArea == true;
  var thresh = opt.overlap.threshold;

  for ( y = 0; y < height; y++ ) {
    for ( x = 0; x < width; x++ ) {
      k = ( y * width + x ) * 4;
      count = 0;

      for (j = 0; j < nLayer; j++) {
        if( store[j][k+3]  > thresh ) count++;
      }
      if ( count >= nLayersOverlap ) {
        data[k] = 255;
        data[k+1] = 0;
        data[k+2] = 0;
        data[k+3] = 255;
        countAll += count;
        if( calcArea ){
          area += px.getPixelAreaAtPoint(x,y); 
        }
      }
    }
  }

  px.result.nPixelTotal = nPix;
  px.result.nPixelFound = countAll;

  if( calcArea ){
    px.result.area = area;
  }

  ctx.putImageData(imageData,0,0,0,0,width,height);

};



PixOp.prototype._findOverlapSpotlight = function(){

  var px = this;
  var opt = px.opt;
  var canvas = px.canvas;
  var ctx = canvas.getContext("2d");
  var width = canvas.width;
  var height = canvas.height;
  var x, y, k, j;
  var count = 0,countCells = 0, countAll = 0;
  var store = px.data.pixels;
  var nLayer = store.length;
  var radius = opt.canvas.spotlightRadius || 10;
  var nPix = height * width;
  var hasOverlap = false;
  var off = px.makeCanvas({width:width,height:height}); 
  var ctxOff = off.getContext("2d",{ alpha: false }); 
  var nLayersOverlap = ( opt.overlap.nLayersOverlap * 1 ) || nLayer; // 0 means all
  var calcArea =  opt.overlap.calcArea == true;
  var thresh = opt.overlap.threshold;
  var area = 0;
  var cells = [];
  var buffer = px.getCircle(radius);
  /**
   * Black rect as starting point. 
   * everything else will be dest-out : like an eraser, new shapes
   * will replace old pixels.
   */
  ctxOff.fillRect(0, 0, width, height);
  ctxOff.globalCompositeOperation ="destination-out";


  /**
   * Find overlap and draw buffer
   */
  for( x = 0; x < width ; x ++ ){
    for( y = 0; y < height ; y ++ ){
      k = ( y * width + x ) * 4;
      count = 0;
      hasOverlap = false;
      for ( j = 0; j < nLayer; j++ ) {
        if( ! hasOverlap ){
          if( store[ j ][ k + 3 ] > thresh ) count ++;
          if ( count >= nLayersOverlap ) {
            hasOverlap = true;
            countAll += count;
            if( calcArea ){
              area += px.getPixelAreaAtPoint(x,y); 
            }
            ctxOff.drawImage(buffer,x-radius,y-radius);
          }
        }
      }
    }
  }
  if( calcArea ){
    px.result.area = area;
  }
  px.result.nPixelTotal = nPix;
  px.result.nPixelFound = countAll;

  ctx.drawImage(off,0,0,width,height);

};

PixOp.prototype.getResolution = function(){
  var px = this;
  var map = px.map;
  var ext = px.getMapBounds();
  var width = px.canvas.width;
  var height = px.canvas.height;
  var distLat = px.getLatLngDistance({
    lng: ext.minLng,
    lat: ext.minLat
  },{
    lng: ext.minLng,
    lat: ext.maxLat
  });
  var distLng  = px.getLatLngDistance({
    lng: ext.minLng,
    lat: ext.maxLat
  },{
    lng : ext.maxLng,
    lat : ext.maxLat
  });

  return {
    lng: distLng/width,
    lat: distLat/height
  };
};




PixOp.prototype.getCircle = function(radius){
  var px = this;
  var circles = px._cache.circles;
  var ctxCircle;

  radius = Math.ceil(radius);
  var circle = circles[radius];

  if( !circle ){
    circle = px.makeCanvas({width:radius*2,height:radius*2});
    ctxCircle = circle.getContext("2d");
    ctxCircle.beginPath();
    ctxCircle.arc(radius, radius, radius, 0, 2 * Math.PI);
    ctxCircle.closePath();
    ctxCircle.fill();
    circles[radius] = circle;
  }
  return circle;
};


PixOp.prototype.updateRenderOptions = function(opt){
  var px = this;
  var def = px.getDefault('render_options');
  opt = opt || def;
  var isObjectParam;
  Object.keys( def ).forEach( type => {
    isObjectParam = typeof def[type] === 'object';
    if( !opt[type] ) opt[type] = isObjectParam ? {} : def[type];
    if( isObjectParam ){
      Object.keys(def[type]).forEach(id => {
        if( typeof opt[type][id] === "undefined"  ) opt[type][id] = def[type][id];
      });
    }
  });
  px.opt = opt;
  return px;
};

PixOp.prototype.refresh = function(){
  var px = this;
  return new Promise(resolve => {
    px.sources.canvas.play();
    setTimeout(function(){
      px.sources.canvas.pause();
    },100);
    resolve(px);
  });
};

/*
 * Get mapbox gl bounds
 */
PixOp.prototype.getMapBounds = function(){
  var px = this;
  var bounds = px.map.getBounds();
  return {
    maxLat : bounds.getNorth(),
    maxLng : bounds.getEast(),
    minLat : bounds.getSouth(),
    minLng : bounds.getWest()
  };
};

PixOp.prototype.getFeatures = function(){

  var px = this;
  px._timing('update_feature_get','start');
  var config = px.config;
  var map = config.map;
  var featuresGroup = [];

  /**
   * Get base name for group layer eg. MX-ABC@01 > MX-ABC
   */
  var layerBaseNames = mx.helpers.getLayerNamesByPrefix({
    map : map,
    prefix: config.layer_prefix,
    base : true
  });


  layerBaseNames.forEach(function(l){

    /**
     * Get feature by group MX-ABC@01, MX-ABC@02, etc..
     */
    var layersNames = mx.helpers.getLayerNamesByPrefix({
      map : map,
      prefix : l
    });

    var featuresQuery = map.queryRenderedFeatures({
      layers : layersNames
    });


    /**
     * Replace properties by layer id
     */
    featuresQuery = featuresQuery.map(function(feature){
      return {
        type : feature.type,
        geometry : feature.geometry,
        properties : { id: l }
      };
    });


    /**
     * Store result
     */
    featuresGroup.push(featuresQuery);

  });

  px._timing('update_feature_get','stop');
  return featuresGroup;
};


PixOp.prototype.layerToCanvas = function(layer){
  var px = this;
  var opt = px.opt;
  var radius;
  var point;

  var canvas = px.makeCanvas({
    width : px.canvas.width,
    height : px.canvas.height
  });
  var circle;
  var ctx = canvas.getContext('2d');

  /**
   * Set default style
   */
  ctx.lineWidth = opt.canvas.lineWidth;
  ctx.lineCap = opt.canvas.lineCap;
  ctx.lineJoin = opt.canvas.lineJoin;
  ctx.fillStyle = opt.canvas.fillColor;
  ctx.strokeStyle = opt.canvas.strokeColor;

  var isPoly = false;
  var isLine = false;
  var isPoint = false;

  /**
   * Render the coordinates of each layer geometry 
   * to the canvas
   */
  px.onEachFeatureCoords(layer,{
    onFeatureStart : function(feature,type){

      isPoly = type == "Polygon" || type == "MultiPolygon";
      isPoint = type == "Point" || type === "MultiPoint";
      isLine = type == "LineString" || type == "MultiLineString";
    },
    onCoord : function(coord,type,first,last){

      point = px.coordToPoint(coord[0], coord[1]);

      if( point ){
        if( isPoint ){
          radius = opt.canvas.circleRadius / px.getPixelSizeMeterAtLat(coord[1]);
          circle = px.getCircle( radius );
          ctx.drawImage(circle,point.x-radius,point.y-radius);
        }else{
          if ( first ) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
            if( last ){
              if( isLine ){
                ctx.stroke();
              }
              if( isPoly ){
                ctx.closePath();
                ctx.fill();
              }
            }
          }
        }
      }
    },
    onFeatureEnd :  function(feature,type){

    }
  });


  return canvas;

};


PixOp.prototype.coordToPoint = function(lng,lat){
  var px = this;
  var opt = px.opt;
  var map = px.map;
  var valid = isFinite(lng) && isFinite(lat);
  var point;
  if( valid ){
    point = map.project([lng,lat]);
    if( opt.canvas.scale != 1){
      point.x = point.x * opt.canvas.scale;
      point.y = point.y * opt.canvas.scale;
    }
  }
  return point;
};

PixOp.prototype.pointToCoord = function(x,y){
  var px = this;
  var map = px.map;
  return map.unproject([x,y]);
};


PixOp.prototype.degreesToMeters = function(lon,lat) {
  var x = lon * 20037508.34 / 180;
  var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  return {
    x : x,
    y : y
  };
};

PixOp.prototype.metersToDegrees = function(x,y) {
  var lng = x *  180 / 20037508.34 ;
  var lat = Math.atan(Math.exp(y * Math.PI / 20037508.34)) * 360 / Math.PI - 90; 
  return {
    lat : lat,
    lng : lng
  };
};

PixOp.prototype.getPixelSizeMeterAtLat = function(lat) {
  var px = this;
  return 40075016.686 * Math.abs(Math.cos(lat / 180 * Math.PI)) / Math.pow(2, px._cache.map_zoom + 8);
};

PixOp.prototype.getPixelAreaAtPoint = function(x,y) {
  /**
   *      dx
   *    *––––––*
   *    |
   * dy |
   *    |
   *    *
   */
  var px = this;
  var map = px.map;
  var sc = px.opt.canvas.scale;
  var topLeft = map.unproject([(x-0.5)/sc, (y-0.5)/sc]);
  var topRight = map.unproject([(x+0.5)/sc,(y-0.5)/sc]);
  var bottomLeft = map.unproject([(x-0.5)/sc,(y+0.5)/sc]);
  var dx = px.getLatLngDistance(topLeft,topRight);
  var dy = px.getLatLngDistance(topLeft,bottomLeft);
  return dx * dy;
};

PixOp.prototype.getLatLngDistance = function(latlng1, latlng2) {
  // Uses spherical law of cosines approximation.
  const R = 6371000;

  const rad = Math.PI / 180,
    lat1 = latlng1.lat * rad,
    lat2 = latlng2.lat * rad,
    a = Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos((latlng2.lng - latlng1.lng) * rad);

  const maxMeters = R * Math.acos(Math.min(a, 1));
  return maxMeters;

};

PixOp.prototype.makeCanvas = function(opt){
  var px = this;
  var canvas = px.makeEl('canvas',opt);
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return canvas ;
};

PixOp.prototype.makeEl = function(type,opt){
  var el = document.createElement(type);
  Object.keys(opt).forEach(o => {
    el[o] =  opt[o];
  });
  return el;
};

PixOp.prototype.onEachFeatureCoords = function(geojson,options){
  var px = this;
  var g, gL, i, iL, j, jL, c, cL, gj, skip;
  var coord, coords, type, point;
  var o = options;
  var opt = px.opt;
  var feature;
  var features;
  geojson = geojson instanceof Array ? geojson : [geojson];
  var filterPolygons = opt.overlap.calcArea === true;


  if(o.onStart) o.onStart(geojson);


  /**
   *  For each member of the group
   */
  for (g = 0, gL = geojson.length; g < gL; g++){
    gj = geojson[g];
    /**
     * For each features in the featureCollection or assume gj is a single feature
     */
    features =  gj.features || [ gj ];

    for ( i = 0, iL = features.length; i < iL; i++ ) {

      feature = features[i];
      type = feature.geometry.type;
      coords = feature.geometry.coordinates;
      skip = filterPolygons && type.indexOf('Poly') == -1;

      if( !skip ){
        /**
         * On feature end
         */
        if(o.onFeatureStart) o.onFeatureStart(feature,type);

        /**
         * For each coord
         */
        px.onEachCoord(coords,type,o.onCoord);

        /**
         * On feature end
         */
        if(o.onFeatureEnd) o.onFeatureEnd(feature,type);
      }
    }

  }
  if(o.onEnd) o.onEnd();

  /**
   * Helper
   */

};

PixOp.prototype.onEachCoord = function(coords,type,cb){
  var last = false;
  var first = false;
  var length = 0;

  getCoord(coords,0);

  function getCoord(a,index){
    if(a[0] instanceof Array){
      length = a.length;
      a.forEach( ( b , i) => {
        getCoord(b,i);
      });
    }else{
      first = index == 0;
      last = index == length-1;
      cb(a,type,first,last);
    }
  }
};

PixOp.prototype._timing = function(id,start,reset){
  var px = this;
  var opt = px.opt;
  if( opt.debug ){
    id = id || 'generic';
    start = start == 'start';

    if(reset){
      px.timing = {};
    }

    if(start){
      px.timing[id] = {
        start : performance.now(),
        diff : 0
      };
    }else{
      px.timing[id].diff = performance.now() - px.timing[id].start;
      console.log({
        id : id,
        duration : px.timing[id].diff
      }) ;
    }
  }
};

PixOp.prototype.getScaledContext = function() {
  var px = this;
  var canvas = this.canvas;
  /**
  * https://www.html5rocks.com/en/tutorials/canvas/hidpi/
  */
  // Get the device pixel ratio, falling back to 1.
  var dpr = window.devicePixelRatio || 1;
  // Get the size of the canvas in CSS pixels.
  var rect = canvas.getBoundingClientRect();
  // Give the canvas pixel dimensions of their CSS
  // size * the device pixel ratio.
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  var ctx = canvas.getContext('2d');
  // Scale all drawing operations by the dpr, so you
  // don't have to worry about the difference.
  ctx.scale(dpr, dpr);
  return ctx;
};
