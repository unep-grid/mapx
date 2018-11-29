const wktToJson = require('wellknown').parse;
const geomToWkt = require('wellknown').stringify;
const martinez = require('martinez-polygon-clipping');
const turf = require('@turf/turf');
const clientPgWrite = require.main.require("./db").pgWrite;
const clientPgRead = require.main.require("./db").pgWrite;
const authenticateHandler = require("./authentification.js").authenticateHandler;
const utils = require('./utils.js');
const toRes = utils.toRes;
const registerSource = require('./db.js').registerSource;
const getColumnsNames = require('./db.js').getColumnsNames;
const areLayersValid = require('./db.js').areLayersValid;
const getLayerTitle = require('./db.js').getLayerTitle;

/**
 * Upload's middleware
 */
module.exports.get = [
  authenticateHandler,
  getOverlapHandler
];


function getOverlapHandler(req, res, next) {

  var start = Date.now();
  var layers = req.query.layers ? req.query.layers.split(',') || [] : [];
  var countries = req.query.countries ? req.query.countries.split(',') || [] : [];
  var idProject =  req.query.idProject;
  var idUser =  req.query.idUser*1;
  var sourceTitle = req.query.sourceTitle || 'Overlap ' + Math.random().toString(36).substring(1,7) ;
  var idSource = utils.randomString("mx_vector", 4, 5).toLowerCase() + "_o_u_" + idUser;

  var method = req.query.method || 'getArea' || 'createSource';
  res.setHeader('Content-Type', 'application/json');

  var config = {
    countries : countries,
    layers : layers,
    mainLayer : layers[0],
    method :  method,
    idProject : idProject,
    idSource : idSource,
    idUser : idUser,
    sourceTitle : sourceTitle,
    send : {
      message: function (msg) {
        res.write(toRes({
          type: 'message',
          msg: msg
        }));
      },
      area: function ( area ) {

        res.write(toRes({
          type: 'result',
          msg: {
            content : 'area',
            unit: 'm2',
            value: area
          }
        }));

      },
      sourceMeta: function( sourceMeta ){

        res.write(toRes({
          type: 'result',
          msg: {
            content : 'sourceMeta',
            value: sourceMeta
          }
        }));

      },
      end : function(msg){

        res.write(toRes({
          type: 'timing',
          msg: {
            duration : Date.now() - start,
            unit : 'ms'
          }
        }));

        res.write(toRes({
          type: 'end',
          msg: msg
        }));

        res.end();
      }
    }
  };

  return areLayersValid(layers)
    .then( layers => {
      layers.forEach( layer => {
        if( !layer.valid ){
          res.write(toRes({
            type: 'error',
            msg : 'Layer ' + layer.id + '( '+ layer.title +' ) has invalid geometry. Please correct it, then try again'
          }));
          throw new Error("Invalid geometry found");
        }
      });
    })
    .then(() => {
      if( method == 'createSource' ){
        return getOverlapCreateSource(config);
      }else{
        return getOverlapArea(config);
      }
    })
    .catch(e => {
      res.write(toRes({
        type: 'error',
        msg: e.message
      }));
      res.end();
    });
}

/**
 * Create a new source based on intersection of feature 
 * using a multilayer and multi-country approach.
 */
function getOverlapCreateSource(options){

  var send = options.send;
  send.message = send.message || console.log;
  //send.area = send.area || console.log;
  send.sourceMeta = send.sourceMeta || console.log;

  var layers = options.layers;
  var nLayers = layers.length;

  var layerAliasPrevious, layerAlias, layerCurrent, attr;
  var finalBlock = false;

  return getColumnsNames(options.mainLayer)
    .then(attrOut => {
      attrOut = attrOut.filter( a => a != 'geom');
      attrOut = utils.attrToPgCol(attrOut);

      send.message('Build query');

      /**
       * New table block
       */
      var sqlQuery = `
      CREATE TABLE ${options.idSource} AS
      `;
      /**
       * Country block
       */
      sqlQuery = sqlQuery + `
      WITH countries as (
        SELECT ST_Union(geom) geom from mx_countries
        WHERE iso3code = ANY($1::text[])
      ),`;

      /**
       * Layers block
       */
      for(var i = nLayers - 1 ; i >= 0 ; i-- ){
        finalBlock = i == 0;
        layerCurrent = layers[i];
        layerAlias = 'layer_'+i;
        layerAliasPrevious = layerAliasPrevious ? 'layer_' + (i + 1) : 'countries' ;
        attr = finalBlock ? ( attrOut + ',' ) : '';
        /**
         * Template with block 
         */
        sqlQuery = sqlQuery + `
        ${layerAlias} as (
          SELECT ${attr}
          CASE WHEN GeometryType(m.geom) = $$POINT$$
          THEN
          m.geom
          ELSE
          CASE 
          WHEN ST_CoveredBy(
            m.geom,
            k.geom
          ) 
          THEN 
          m.geom 
          ELSE
          ST_Multi(
            ST_Intersection(
              k.geom,
              m.geom
            )
          )
          END
          END geom
          FROM ${layerCurrent} m, ${layerAliasPrevious} k
          WHERE m.geom && k.geom AND ST_Intersects(m.geom, k.geom)
        )` + ( finalBlock ? '':',' );

        /**
         * Final query to build the table
         */
        if(finalBlock){
          sqlQuery = sqlQuery + `
          SELECT ${attr} geom from ${layerAlias}`;
        }
      }

      send.message('Query built, create table, please wait');
      options.query = sqlQuery;
      return clientPgRead.query({
        text : sqlQuery,
        values: [options.countries],
      });

    })
    .then(res => {
      return registerSource(options);
    })
    .then(res => {

      send.message('New source "' + options.sourceTitle +'" created ( id "' + options.idSource+ '" )'  );

      send.sourceMeta({
        idSource : options.idSource,
        idUser : options.idUser,
        idProject : options.idProject,
        sourceTitle : options.sourceTitle
      });

      send.end('Done!');
    });

}



function getOverlapArea(options) {

  var queryCountries = {};
  var dataCountries = [];
  var dataLayers = [];
  var area = 0;
  var send = options.send;
  var cIntersect = [];
  var cIntersectMultiPolygon = {};
  var countries = options.countries || [];
  var layers = options.layers || [];

  send.message = send.message || console.log;
  send.area = send.area || console.log;

  return new Promise((resolve, reject) => {

    send.message('Start overlap with countries = ' + JSON.stringify(countries) + ' and layers = ' + JSON.stringify(layers));

    var hasCountries = countries.length > 0;
    var queryLayers = [];
    var req = "";

    // Test countries input
    if (countries.length !== 1) {
      throw new Error("The number of countries is invalid!");
    }

    // Test layers input
    if (layers.length === 0 || layers.length > 3) {
      throw new Error("The number of layers is invalid!");
    }

    // Parameterized query that returns a GeometryCollection containing the countries' geom
    queryCountries = {
      text: `SELECT ST_AsText(ST_Buffer(ST_Collect(geom),0)) as geom
      FROM mx_countries 
      WHERE CASE WHEN $1 
      THEN 
      iso3code = ANY($2::text[]) 
      ELSE 
      false 
      END`,
      values: [hasCountries, countries],
      rowMode: 'array'
    };

    // Parameterized query that returns a GeometryCollection containing the layer's geom
    for (var i = 0, iL = layers.length; i < iL; i++) {
      if (hasCountries === true) {
        req = {
          text: `WITH countries AS(
            SELECT geom as geom
            FROM mx_countries
            WHERE iso3code = ANY($1::text[]))
          SELECT ST_AsText(ST_Buffer(ST_Collect(l.geom),0)) 
          FROM ${layers[i]} l, countries c
          WHERE l.geom && c.geom AND ST_Intersects(l.geom,c.geom)`,
          values: [countries],
          rowMode: 'array'
        };
      } else if (hasCountries === false) {
        req = {
          text: `SELECT ST_AsText(ST_Buffer(ST_Collect(l.geom),0))
          FROM ' + layers[i] + ' l`,
          rowMode: 'array'
        };
      }
      queryLayers.push(req);
    }

    // Query to fetch the countries & layers geometries + conversion to GeoJSON
    var promLayers = queryLayers.map((l, i) => {
      var data = [];
      var out = {};

      return clientPgRead.query(l)
        .then(res => {
          send.message('Extract data of layer ' + i);
          data = res.rows[0];
          out = wktArrayToJson(data);
          return out;
        });
    });

    resolve(promLayers);
  })
    .then( promLayers =>{
      return Promise.all(promLayers);
    })
    .then(dataLayersJSON => {

      send.message('Data extracted : ' + dataLayersJSON.length + ' layers');

      var dataLayersJSONFiltered = dataLayersJSON.filter(function (el) {
        return el != null;
      });

      if (dataLayersJSON.length >= 2 && dataLayersJSON.length === dataLayersJSONFiltered.length) {
        dataLayers = dataLayersJSONFiltered.reduce((intersection, layer, index) => {
          var lc = layer.coordinates;
          intersection = intersection instanceof Array ? intersection : intersection.coordinates;
          send.message('Intersect between layer ' + index + ' and previous');
          if (areCoordsValid(lc, intersection)) {
            return martinez.intersection(lc, intersection);
          } else {
            return [];
          }
        });
      } else if (dataLayersJSON.length === 1 && dataLayersJSONFiltered.length === 1) {
        dataLayers = dataLayersJSONFiltered[0].coordinates;
      } else {
        dataLayers = [];
      }

      if (dataLayers instanceof Array && dataLayers.length > 0) {
        return clientPgRead.query(queryCountries);
      } else {
        return Promise.resolve(false);
      }
    })
    .then(dataCountriesWKT => {

      if (!dataCountriesWKT) {
        send.message('No layers intersect, skip countries');
      } else {
        var data = dataCountriesWKT.rows[0];
        send.message('Extract data of countries');
        dataCountries = wktArrayToJson(data);
        var cCountries = dataCountries.coordinates;
        var cLayers = dataLayers;

        send.message('Intersect between the layers intersection and countries');
        if (areCoordsValid(cCountries, cLayers)) {
          cIntersect = martinez.intersection(cCountries, cLayers);
        }

        if (cIntersect instanceof Array && cIntersect.length > 0) {
          send.message('Build geometry');
          cIntersectMultiPolygon = turf.multiPolygon(cIntersect);
          send.message('Compute area');
          area = turf.area(cIntersectMultiPolygon);
        }
      }
      send.area(area);
      send.end('Done!');
      return true;
    });
}

/** 
 * helpers 
 * 
 * 
 * 
 */

/* Check if both input are valid before being processed by martinez
 *  @param {Array} a Array of coordinates
 *  @param {Array} b Array of coordinates
 *  @return {Boolean} Both are valid 
 */
function areCoordsValid(a, b) {
  return a instanceof Array && b instanceof Array && a.length > 0 && b.length > 0;
}

/* Parse & stringify Well-Known Text (WKT) into GeoJSON
 *  @param {Array} res Array of WKT geometries (as string)
 *  @return {Boolean} GeoJSON geometry object or null if parse fails
 */
function wktArrayToJson(a) {
  var out = {};
  a = a instanceof Array ? a[0] : null;
  out = a ? wktToJson(a) : a;
  return out;
}


/**
 * Create a new source based on data, a geometry produced by 
 * martinez and option, main configuration option.
 */
function buildOverlapSource(data,options){
  var geom = turf.buffer(data.geometry,0);
  var wktOverlap = geomToWkt(geom);

  /**
   * Get a list of column to reimport
   */
  return getColumnsNames(options.mainLayer)
    .then(attr => {
      /**
       * Extract and clip data using overlap geometry as WKT
       */
      return addLayerOverlap(wktOverlap, attr, options);
    })
    .then(res => {
      /**
       * Register created source
       */
      if(res){
        return registerSource(options);
      }else{
        return Promise.resolve(false);
      }
    })
    .then(res => {
      /**
       * Return options as sourceMeta; 
       */
      var sourceMeta = options;
      return sourceMeta;
    });
}

/**
 * Create a posgis table with the 
 * result from the intersect (data)
 * using selected atribute list
 * and the source to build the intersction
 * 
 */
function addLayerOverlap(data,attr,options){

  attr = attr.filter( a => a != 'geom');
  var attributesPg = utils.attrToPgCol(attr);

  var idSourceToCreate = options.idSource;
  var idUser = options.idUser;
  var idSourceToClip = options.mainLayer;

  /**
   * Create actual new source
   */
  var queryNewSource = {
    values : [data], 
    text :`CREATE TABLE `+ idSourceToCreate +` AS

    WITH overlap AS (
      SELECT ST_SetSRID(ST_GeomFromText($1::text),4326) geom
    ),
    layerSubset AS (
      SELECT `+ attributesPg +`, a.geom
      FROM `+ idSourceToClip +` AS a, overlap AS b
      WHERE a.geom && b.geom
      AND ST_Intersects(a.geom, b.geom) 
    )

    SELECT ` + attributesPg + `, ST_Intersection(a.geom,b.geom) geom
    FROM layerSubset a, overlap b
    `};

  var start = getTime();

  return clientPgWrite.query(queryNewSource)
    .then( d=> {
      return true;
    });

  function getTime(){
    return (new Date()).getTime();
  }
}


