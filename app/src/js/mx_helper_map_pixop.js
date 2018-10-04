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
    px.initGeojsonSource();


    px._isRendering = false;
    px._cache = {
      map_zoom : 0,
      circles : {}
    };


  }
  else return new PixOp(config);
}

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


PixOp.prototype.getDefault = function(type){

  var def = {
    actions : [],
    geojson_empty : {
      "type": "FeatureCollection",
      "features": []
    },
    sources : {
      geojson : {},
      canvas : {}
    },
    render_options : {
      type : 'overlap',
      debug : false,
      canvas : {
        add : false,  
        lineWidth : 0,
        lineCap : 'round',
        lineJoin : 'round',
        fillColor: '#F00',
        strokeColor : '#F00',
        circleRadius : 100, //meter
        spotlightBuffer : 100
      },
      geojson : {
        add : true,
        calc : true,
        buffer : 0,
        simplify: 0.001,
        spotlight : true
      }
    },
    data : {
      features : [],
      pixels : [],
      contour : {},
      geojson : {},
      canvas : {}
    } 
  };

  var d = def[type];

  if(!d) throw new Error( type +" not defined as default");

  return JSON.parse(JSON.stringify(d));
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

PixOp.prototype.initGeojsonSource = function(){
  var px = this;

  px._timing('init_geojson','start');

  var idMapGeojson = px.id + '_geojson';
  var map = px.map;

  var l = {
    id: idMapGeojson,
    type: 'fill',
    source: {
      type: 'geojson',
      data: px.getDefault('geojson_empty')
    },
    layout: {},
    paint: {
      'fill-color': '#000',
      'fill-opacity': 0.6
    }
  };

  map.addLayer(l);
  px.sources.geojson = map.getSource(idMapGeojson);

  px._timing('init_geojson','stop');
};


PixOp.prototype.render = function(opt){

  var px = this;
  var res = {};
  var map = px.map;

  render();

  function render(){

    px._timing('render','start',true);

    px.reset()
      .updateOptions(opt)
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

PixOp.prototype.start = function(opt){
  var px = this;

  return px; 
}; 

PixOp.prototype.updateMapParams = function(){
  var px = this ;

  var map = px.map;
  var canvas = px.canvas;
  var src = px.sources.canvas;
  var bounds = px.getMapBounds();
  var topLeft = map.project([bounds.minLng,bounds.maxLat]);
  var bottomRight = map.project([bounds.maxLng,bounds.minLat]);

  px._timing('update_bounds','start');
  canvas.width = (bottomRight.x - topLeft.x) || 1;
  canvas.height = (bottomRight.y - topLeft.y) || 1;

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



PixOp.prototype.hasChanged = function(type){

  var px = this;
  var equal = mx.helpers.isEqual;
  px._timing('has_changed','start');
  var changed = !equal(px._cache.map_bounds, px.map.getBounds()) || 
    !equal(px._cache.map_style, px.map.getStyle()) ;
  px._timing('has_changed','stop');
  return changed;

};


PixOp.prototype.getGeojson = function(){
  var px = this;
  return px.data.geojson;
};

PixOp.prototype.updateGeojson = function(){
  var px = this;
  px.sources.geojson.setData(px.getGeojson());
};

PixOp.prototype.reset = function(){
  var px = this;
  px.actions = px.getDefault('actions');
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

PixOp.prototype.clearGeojson = function(){
  var px = this;  
  px.sources.geojson.setData(px.getDefault('geojson_empty'));
  return px;
};

PixOp.prototype.clear = function(){
  var px = this;
  px.clearCanvas();
  px.clearGeojson();
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
  var i,j,k;
  var count = 0, countAll = 0;
  var store = px.data.pixels;
  var nLayer = store.length;

  for ( i = 0; i < nPix; i++ ) {
    k =  i * 4;
    count = 0;

    for (j = 0; j < nLayer; j++) {
      if( store[j][k+3]  > 0 ) count++;
    }

    if (count > 1) {
      data[k] = 255;
      data[k+1] = 0;
      data[k+2] = 0;
      data[k+3] = 255;
      countAll += count;
    }
  }

  px.result.nPixelTotal = nPix;
  px.result.nPixelFound = countAll;

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
  var count = 0, countAll = 0;
  var store = px.data.pixels;
  var nLayer = store.length;
  var radius = opt.canvas.spotlightRadius || 10;
  var nPix = height * width;
  var hasOverlap = false;
  var off = px.makeCanvas({width:width,height:height}); 
  var ctxOff = off.getContext("2d",{ alpha: false }); 
  /**
   * Black rect as starting point. 
   * everything else will be dest-out : like an eraser, new shapes
   * will replace old pixels.
   */
  ctxOff.fillRect(0, 0, width, height);
  ctxOff.globalCompositeOperation ="destination-out";

  /**
   * Prebuild buffer spotlight
   */
  var buffer = px.getCircle(radius);

  /**
   * Find overlap and draw buffer
   */
  for( x = 0; x < width ; x ++ ){
    for( y = 0; y < height ; y ++ ){

      k = ( ( y * width ) + x ) * 4 ;
      count = 0;
      hasOverlap = false;

      for ( j = 0; j < nLayer; j++ ) {
        if( ! hasOverlap ){
          if( store[ j ][k+3]  > 0 ){
            count++;
            if ( count > 1 ) {
              hasOverlap = true;
              countAll += count;
              ctxOff.drawImage(buffer,x-radius,y-radius);
            }
          }
        }
      }
    }
  }

  px.result.nPixelTotal = nPix;
  px.result.nPixelFound = countAll;

  ctx.drawImage(off,0,0,width,height);

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


PixOp.prototype.updateOptions = function(opt){
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

PixOp.prototype.getDataBounds = function(){
  var px = this;
  var lat, lng; 

  var b = {
    minLat : 90,
    maxLat : -90,
    minLng :  180,
    maxLng :  -180
  };

  function update(lngLat){
    lat = lngLat[1];
    lng = lngLat[0];

    if( lat > -90 && lat < 90 ) {
      if( lat < b.minLat) b.minLat = lat; 
      if( lat > b.maxLat) b.maxLat = lat; 
    }
    if( lng >= -180 && lat <= 180 ) {
      if( lng < b.minLng ) b.minLng = lng; 
      if( lng > b.maxLng ) b.maxLng = lng; 
    }
  }

  px.data.features.forEach( layer => {
    px.onEachFeatureCoords(layer,{
      onCoord : update
    }); 
  });

  return b;
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
     * Add make feature collections
     */
    //featuresQuery= turf.helpers.featureCollection(featuresQuery);

    /**
     * Flatten features
     */
    //featuresQuery = turf.flatten(featuresQuery);

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


  /**
   * Render the coordinates of each layer geometry 
   * to the canvas
   */
  px.onEachFeatureCoords(layer,{
    onFeatureStart : function(feature,type){
      if( type != "Point" ){
        ctx.beginPath();
      }
    },
    onCoord : function(coord,type,index){

      point = px.coordToPoint(coord[0], coord[1]);

      if(type == "Point" ){
        radius = opt.canvas.circleRadius / px.getPixelSizeMeterAtLat(coord[1]);
        circle = px.getCircle( radius );
        ctx.drawImage(circle,point.x-radius,point.y-radius);
      }else{
        if ( index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
    },
    onFeatureEnd :  function(feature,type){

      ctx.stroke();

      if(type.indexOf("Line") == -1){

        ctx.fill();

      }
    }
  });

  return canvas;

};


/**
 * HELPERS
 */


PixOp.prototype.coordToPoint = function(lng,lat){
  var px = this;
  var map = px.map;
  var point = map.project([lng,lat]);
  //var delta = map.project([px.bounds.minLng,px.bounds.maxLat]);

  //point.x = point.x - delta.x;
  //point.y = point.y - delta.y;

  return point;
};

PixOp.prototype.pointToCoord = function(x,y){
  var px = this;
  var map = px.map;
  /*  var delta = map.project([px.bounds.minLng,px.bounds.maxLat]);*/
  //var point = {};

  //point.x = x + delta.x;
  /*point.y = y + delta.y;*/
  //x,yreturn map.unproject(point);
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


PixOp.prototype.makeCanvas = function(opt){
  var px = this;
  return px.makeEl('canvas',opt);
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
  var g, gL, i, iL, j, jL, c, cL, gj;
  var coord, coords, type, point;
  var o = options;
  var feature;
  var features;
  geojson = geojson instanceof Array ? geojson : [geojson];

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
  if(o.onEnd) o.onEnd();

  /**
   * Helper
   */

};

PixOp.prototype.onEachCoord = function(coords,type,cb){
  var index = 0;
  getCoord(coords);
  function getCoord(a){
    if(a[0] instanceof Array){
      a.forEach( b => {
        getCoord(b);
      });
    }else{
      cb(a,type,index ++);
    }
  }
};

PixOp.prototype.getSpotlight = function(geometry){
  var px = this;
  var world = [[-180,85],[180,85],[180,-85],[-180,-85],[-180,85]];

  if( geometry.type == "Feature" ){
    geometry = geometry.geometry;
  }

  if( geometry.type == "MultiPolygon" ){
    geometry.coordinates = geometry.coordinates.map(c => c[0]);
  }

  geometry.coordinates.unshift(world);
  geometry.coordinates = [geometry.coordinates];
  geometry.type = "MultiPolygon";

  return geometry ;
};

PixOp.prototype.getImageBand = function(band){
  var px = this;
  px._timing('get_imageband','start');

  var bandN = {
    'r':0, 'red':0,
    'g':1, 'green':1,
    'b':2, 'blue':2,
    'a':3, 'alpha':3
  }[ band || 'a' ] || 0;

  var canvas = px.canvas;
  var width = canvas.width;
  var height = canvas.height;
  var nPixels = width * height;
  var ctx = canvas.getContext('2d');
  var imageData = ctx.getImageData(0,0,width,height);
  var data = imageData.data;
  var d =  new Uint8ClampedArray(nPixels);
  var i, k;

  for( i=0; i < nPixels; i++ ){
    k = i*4;
    d[i] = data[ k + bandN ];
  }

  px._timing('get_imageband','stop');
  return d;
};


PixOp.prototype.setContourByBand = function(band){

  var px = this;
  var nCoord;
  px._timing('update_contour','start');
  var contours = px.tools.d3.contour.contours;
  var width = px.canvas.width;
  var height = px.canvas.height;
  var thresold  = 254; // 255 = full alpha
  var a = px.getImageBand( band || 'alpha' );

  /**
   * Create an array of geojson multipolygon for each thresold
   */
  var out = contours()
    .size([width, height])
    .smooth(true)
    .thresholds([0,254])
  (a);

  /**
   * Get only the > 254 contour
   */
  out = out[1];

  px._timing('update_contour','stop');

  /**
   * Rebuild a geojson with lat/long coordinates
   */
  px._timing('contour_coords_to_lnglat','start');

  px.onEachCoord(out.coordinates,null,function(coord){
    nCoord = px.pointToCoord(coord[0],coord[1]);
    coord[0] = nCoord.lng;
    coord[1] = nCoord.lat;
  });

  px._timing('contour_coords_to_lnglat','stop');

  /**
   * Save result
   */ 
  px._timing('contour_save','start');
  px.data.contour = out;
  px.data.geojson =  px.cloneObj(out);
  px._timing('contour_save','stop');

};


PixOp.prototype.setGeojsonSimplify = function(opt){
  var px = this;
  px._timing('geojson_simplify','start');

  var simplify = px.tools.turf.simplify;
  var gj = px.data.geojson;

  px.data.geojson = simplify(gj,{
    tolerance : opt.geojson.simplify,
    highQuality : false,
    mutate : true
  });

  px._timing('geojson_simplify','stop');

};


PixOp.prototype.setGeojsonBuffer = function(opt){
  var px = this;
  px._timing('geojson_buffer','start');
  var buffer = px.tools.turf.buffer;
  var gj = px.data.geojson;
  px.data.geojson = buffer( gj, opt.geojson.buffer,
    {
      units : 'meters'
    });

  px._timing('geojson_buffer','stop');
};

PixOp.prototype.setGeojsonSpotlight = function(opt){
  var px = this;
  px._timing('geojson_spotlight','start');
  var gj = px.data.geojson;
  px.data.geojson = px.getSpotlight(gj);
  px._timing('geojson_spotlight','stop');
};

PixOp.prototype.setGeojson = function(){

  var px = this;

  if( px.data.features.length  == 0 ) return;

  px.setContourByBand('alpha');

  if( opt.geojson.simplify ){
    px.setGeojsonSimplify();
  }

  if( opt.geojson.buffer ){
    px.setGeojsonBuffer();
  }

  if( opt.geojson.spotlight ){
    px.setGeojsonSpotlight();
  }

};

PixOp.prototype.updateGeojson = function(opt){

  var px = this;

  if( px.data.features.length  == 0 ) return;

  px.data.geojson =  px.cloneObj(px.data.contour);

  if( opt.geojson.simplify ){
    px.setGeojsonSimplify();
  }

  if( opt.geojson.buffer ){
    px.setGeojsonBuffer();
  }

  if( opt.geojson.spotlight ){
    px.setGeojsonSpotlight();
  }

  if( opt.geojson.add ){
    mx.pixop.updateGeojson();
  }
};

PixOp.prototype.addAction = function(fun){
  var px = this;
  var res;

  var action = {
    start : function(){
      var r = res;
      return new Promise(resolve => {
        r = res = resolve;
        fun(px,resolve);
      });
    },
    cancel : function(){
      var out; 
      if(res instanceof Function){
        out =  res(px);
      }else{
        out = Promise.resolve(px);
      }
      console.log('cancel');
      return out;
    }
  };

  px.actions.push(action);
  return px;
};

PixOp.prototype.compute = function(){
  var px = this;
  var res;
  var actions = px.actions;

  var out = actions.reduce((p, fn) => {

    if( px.hasChanged() ){
      return p.then(fn.cancel);
    }else{
      return p.then(fn.start);
    }

  }, Promise.resolve());

  return px;
};


PixOp.prototype.cloneObj = function(obj){
  obj = obj || {};
  return JSON.parse(JSON.stringify(obj));
};


PixOp.prototype._timing = function(id,start,reset){
  var px = this;
  if(px.debug){
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

PixOp.prototype.loadVectorModules = function(){

  var px = this;

  return  Promise.all([
    System.import("d3-contour"),
    System.import("@turf/helpers"),
    System.import("@turf/meta"),
    System.import("@turf/flatten"),
    System.import("@turf/buffer"),
    System.import("@turf/mask"),
    System.import('@turf/simplify')
  ]).then(m =>{

    px.tools = {
      d3 : {
        contour : m[0]
      },
      turf : {
        helpers : m[1],
        meta : m[2],
        flatten : m[3].default,
        buffer : m[4].default,
        mask : m[5].default,
        simplify : m[6].default
      }
    };
  });

};

