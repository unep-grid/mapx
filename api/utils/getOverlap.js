const { Pool, Client } = require('pg');
const parseWKT  = require('wellknown');
const martinez  = require('martinez-polygon-clipping');
const turf  = require('@turf/turf');
const clientPgRead = require.main.require("./db").pgWrite;
const zlib  = require("zlib");


exports.get = function(req,res,next){


  var start = Date.now();
  var layers = req.query.layers ? req.query.layers.split(',') || [] : [] ;
  var countries = req.query.countries ? req.query.countries.split(',') || [] : [] ;
  var method = req.query.method || 'getArea'; 
  res.setHeader('Content-Type', 'application/json');

  if( method == 'getArea' ){
    return getOverlapArea( countries, layers, {
      message : function(msg){
        res.write(toString({
          type:'message',
          msg: msg
        }));
      },
      result : function(msg){

        res.write(toString({
          type:'timing',
          msg: Date.now() - start,
          unit : 'ms'
        }));

        res.write(toString({
          type:'result',
          msg: msg,
          unit : 'm2'
        }));
        res.end();
      }
    })
      .catch(e => {
        res.write(toString({
          type:'error',
          msg:  e.message
        }));
        res.end();
      });
  }else{
    res.write(toString({
      type:'error',
      msg: 'Method ' + method + ' not yet handled'
    }));
    res.end();
  }
};

function getOverlapArea(countries,layers,send){

  return new Promise(( resolve, reject ) => {

    send.message = send.message || console.log;
    send.result = send.result || console.log;

    send.message('Start overlap with countries = ' + JSON.stringify(countries) + ' and layers = ' + JSON.stringify(layers) );

    var hasCountries = countries.length > 0;
    var queryLayers = [];
    var req = "";

    // Test countries input
    if (countries.length !== 1) {
      throw new Error("The number of countries is invalid!");
    }

    // Test layers input
    if (layers.length === 0 && layers.length <= 3) {
      throw new Error("The number of layers is invalid!");
    }

    // Parameterized query that returns a GeometryCollection containing the countries' geom
    const queryCountries = {
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
          values: [ countries ],
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

    // Merge all SQL queries in one array
    queryLayers.push(queryCountries);
    

    // Query to fetch the countries & layers geometries + conversion to GeoJSON
    var promLayers = queryLayers.map(( l,i )=> {
      return clientPgRead.query(l)
        .then( r => {
          send.message('Extract data of layer' + i);
          var a = r.rows[0];
          a = a instanceof Array ? a[0] : null;
          return a ? parseWKT(a) : a;
        });
    });
 
    resolve(promLayers);

  })
    .then( promLayers => {

      send.message('Extract all data');
      return Promise.all(promLayers);
    })
    .then(res => {

      send.message('Data extracted : ' + res.length + ' layers');
      var area = null;
      var resFiltered = res.filter(function (el) {
        return el != null;
      });

      if (resFiltered.length < 2) {
        throw new Error("Intersection cannot be compute because the number of layer is smaller than 2!");
      }

      let m = resFiltered.reduce((intersection, layer, index) => {
        var lc = layer.coordinates;
        intersection = intersection instanceof Array ? intersection : intersection.coordinates;
        send.message('Intersect between layer ' + index + ' and previous');
        if (areCoordsValid(lc, intersection)) {
          return martinez.intersection(lc, intersection);
        } else {
          throw new Error('Invalid coordinates for layer ' + index );
        }
      });


      if (m instanceof Array) {
        send.message('Build geometry');
        m = turf.multiPolygon(m);
        send.message('Compute area');
        area = turf.area(m);
      }

      send.message('Send result');
      send.result(area);
      return area;
    });

}
/** helpers 
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

/**
 * Send string for message
 * @param {Object} obj object to be converted in string for messages
 */
function toString(obj){
  return JSON.stringify(obj)+"\t\n";
}



