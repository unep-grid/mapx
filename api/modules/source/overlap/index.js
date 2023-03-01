import { isArray } from "@fxi/mx_valid";
import { parse as wktToJson } from "wellknown";
import martinez from "martinez-polygon-clipping";
import { multiPolygon, area as getArea } from "@turf/turf";
import { toRes, randomString, attrToPgCol } from "#mapx/helpers";
import { sendMailAuto } from "#mapx/mail";
import { pgWrite } from "#mapx/db";
import {
  validateTokenHandler,
  validateRoleHandlerFor,
} from "#mapx/authentication";
import {
  registerOrRemoveSource,
  removeSource,
  getColumnsNames,
  areLayersValid,
  analyzeSource,
} from "#mapx/db-utils";

/**
 * Upload's middleware
 */
export const mwGetOverlap = [
  validateTokenHandler,
  validateRoleHandlerFor("member"),
  getOverlapHandler,
];

async function getOverlapHandler(req, res) {
  const start = Date.now();
  const layers = req.query.layers ? req.query.layers.split(",") || [] : [];
  const countries = req.query.countries
    ? req.query.countries.split(",") || []
    : [];
  const {
    idProject,

    sourceTitle = "Overlap " + Math.random().toString(36).substring(1, 7),
  } = req.query;
  const idUser = req.query.idUser * 1;
  const emailUser = req.query.email;

  const idSource = randomString("mx_vector", 4, 5).toLowerCase();

  const method = req.query.method || "getArea" || "createSource";
  res.setHeader("Content-Type", "application/json");

  const config = {
    emailUser: emailUser,
    countries: countries,
    layers: layers,
    mainLayer: layers[0],
    method: method,
    idProject: idProject,
    idSource: idSource,
    idUser: idUser,
    sourceTitle: sourceTitle,
    send: {
      message: function (msg) {
        res.write(
          toRes({
            type: "message",
            msg: msg,
          })
        );
      },
      area: function (area) {
        res.write(
          toRes({
            type: "result",
            msg: {
              content: "area",
              unit: "m2",
              value: area,
            },
          })
        );
      },
      sourceMeta: function (sourceMeta) {
        res.write(
          toRes({
            type: "result",
            msg: {
              content: "sourceMeta",
              value: sourceMeta,
            },
          })
        );
      },
    },
  };

  try {
    res.write(
      toRes({
        type: "message",
        msg: `Geometries validation. This could take a while, please be patient. In case of error, a message will appear.`,
      })
    );

    const layersValidated = await areLayersValid(layers, true, false);

    for (const layer of layersValidated) {
      if (!layer.valid) {
        res.write(
          toRes({
            type: "error",
            msg: ` Layer ${layer.title} ( ${layer.id} ) has invalid geometries. Please correct them and try again`,
          })
        );
        throw Error("Invalid geometry found");
      } else {
        res.write(
          toRes({
            type: "message",
            msg: `Geometries seem valid`,
          })
        );
      }
    }

    if (method === "createSource") {
      await getOverlapCreateSource(config);
      await analyzeSource(idSource);
    } else {
      await getOverlapArea(config);
    }

    res.write(
      toRes({
        type: "timing",
        msg: {
          duration: Date.now() - start,
          unit: "ms",
        },
      })
    );

    res.end();
  } catch (e) {
    try {
      res.write(
        toRes({
          type: "error",
          msg: e.message,
        })
      );

      res.end();

      if (method === "createSource" && config.emailUser) {
        await sendMailAuto({
          to: [config.emailUser],
          content: `Source '${config.sourceTitle}' not created. Error : ${e.message}`,
          subject: `MapX - overlap tool error : source '${config.sourceTitle}' not created.`,
        });
      }

      /**
       * Cleaning if needed
       */
      await removeSource(idSource);
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Create a new source based on intersection of feature
 * using a multilayer and multi-country approach.
 */
async function getOverlapCreateSource(options) {
  var send = options.send;
  send.message = send.message || function () {};
  //send.area = send.area || function(){};
  send.sourceMeta = send.sourceMeta || function () {};

  var layers = options.layers;
  var nLayers = layers.length;

  var layerAliasPrevious;
  var layerAlias;
  var layerCurrent;
  var attr;
  var finalBlock = false;

  let attrOut = await getColumnsNames(options.mainLayer);

  attrOut = attrOut.filter((a) => a !== "geom");
  attrOut = attrToPgCol(attrOut);

  send.message("Build query");

  /**
   * New table block
   */
  var sqlQuery = `
      CREATE TABLE ${options.idSource} AS
      `;
  /**
   * Country block
   */
  sqlQuery += `
    WITH countries as (
      SELECT ST_Union(geom) geom from mx_countries
      WHERE iso3code = ANY($1::text[])
    ),`;

  /**
   * Layers block
   */
  for (var i = nLayers - 1; i >= 0; i--) {
    finalBlock = i === 0;
    layerCurrent = layers[i];
    layerAlias = "layer_" + i;
    layerAliasPrevious = layerAliasPrevious ? "layer_" + (i + 1) : "countries";
    attr = finalBlock ? attrOut + "," : "";
    /**
     * Template with block
     */
    sqlQuery =
      sqlQuery +
      `
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
        )` +
      (finalBlock ? "" : ",");

    /**
     * Final query to build the table
     */
    if (finalBlock) {
      sqlQuery += `
        SELECT ${attr} geom from ${layerAlias}`;
    }
  }

  send.message("Query built, create table, please wait");
  options.query = sqlQuery;
  await pgWrite.query({
    text: sqlQuery,
    values: [options.countries],
  });
  const reg = await registerOrRemoveSource(options);

  if (!reg.registered) {
    send.message("No records, table removed");
    if (options.emailUser) {
      await sendMailAuto({
        to: [options.emailUser],
        content: `Source '${options.sourceTitle}' not created. No intersection found.`,
        subject: `MapX - overlap tool failed : source '${options.sourceTitle}' not created.`,
      });
    }
  } else {
    send.message(
      `New source ${options.sourceTitle} created ( ${options.idSource} )`
    );

    if (options.emailUser) {
      await sendMailAuto({
        to: [options.emailUser],
        content: `Source '${options.sourceTitle}' created ( id : ${options.idSource} )`,
        subject: `MapX - overlap tool success : source '${options.sourceTitle}' created`,
      });
    }

    send.sourceMeta({
      idSource: options.idSource,
      idUser: options.idUser,
      idProject: options.idProject,
      sourceTitle: options.sourceTitle,
    });
  }
}

async function getOverlapArea(options) {
  var queryCountries = {};
  var dataCountries = [];
  var dataCountriesWKT = null;
  var dataLayers = [];
  var area = 0;
  var send = options.send;
  var cIntersect = [];
  var cIntersectMultiPolygon = {};
  var countries = options.countries || [];
  var layers = options.layers || [];

  send.message = send.message || "";
  send.area = send.area || function () {};

  send.message(
    "Start overlap with countries = " +
      JSON.stringify(countries) +
      " and layers = " +
      JSON.stringify(layers)
  );

  var hasCountries = countries.length > 0;
  var queryLayers = [];
  var req = "";

  // Test countries input
  if (countries.length !== 1) {
    throw Error("The number of countries is invalid!");
  }

  // Test layers input
  if (layers.length === 0 || layers.length > 3) {
    throw Error("The number of layers is invalid!");
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
    rowMode: "array",
  };

  // Parameterized query that returns a GeometryCollection containing the layer's geom
  for (var i = 0, iL = layers.length; i < iL; i++) {
    if (hasCountries) {
      req = {
        text: `WITH countries AS(
            SELECT geom as geom
            FROM mx_countries
            WHERE iso3code = ANY($1::text[]))
          SELECT ST_AsText(ST_Buffer(ST_Collect(l.geom),0)) 
          FROM ${layers[i]} l, countries c
          WHERE l.geom && c.geom AND ST_Intersects(l.geom,c.geom)`,
        values: [countries],
        rowMode: "array",
      };
    } else if (!hasCountries) {
      req = {
        text: `SELECT ST_AsText(ST_Buffer(ST_Collect(l.geom),0))
          FROM ' + layers[i] + ' l`,
        rowMode: "array",
      };
    }
    queryLayers.push(req);
  }

  // Query to fetch the countries & layers geometries + conversion to GeoJSON
  var promLayers = queryLayers.map((l, i) => {
    var data = [];
    var out = {};

    return pgWrite.query(l).then((res) => {
      send.message("Extract data of layer " + i);
      [data] = res.rows;
      out = wktArrayToJson(data);
      return out;
    });
  });

  const dataLayersJSON = await Promise.all(promLayers);

  send.message("Data extracted : " + dataLayersJSON.length + " layers");

  var dataLayersJSONFiltered = dataLayersJSON.filter(function (el) {
    return el !== null;
  });

  if (
    dataLayersJSON.length >= 2 &&
    dataLayersJSON.length === dataLayersJSONFiltered.length
  ) {
    dataLayers = dataLayersJSONFiltered.reduce((intersection, layer, index) => {
      var lc = layer.coordinates;
      if (!isArray(intersection)) intersection = intersection.coordinates;
      send.message("Intersect between layer " + index + " and previous");
      if (areCoordsValid(lc, intersection)) {
        return martinez.intersection(lc, intersection);
      } else {
        return [];
      }
    });
  } else if (
    dataLayersJSON.length === 1 &&
    dataLayersJSONFiltered.length === 1
  ) {
    dataLayers = dataLayersJSONFiltered[0].coordinates;
  } else {
    dataLayers = [];
  }

  if (isArray(dataLayers) && dataLayers.length > 0) {
    dataCountriesWKT = await pgWrite.query(queryCountries);
  }

  if (!dataCountriesWKT) {
    send.message("No layers intersect, skip countries");
  } else {
    var data = dataCountriesWKT.rows[0];
    send.message("Extract data of countries");
    dataCountries = wktArrayToJson(data);
    var cCountries = dataCountries.coordinates;
    var cLayers = dataLayers;

    send.message("Intersect between the layers intersection and countries");
    if (areCoordsValid(cCountries, cLayers)) {
      cIntersect = martinez.intersection(cCountries, cLayers);
    }

    if (isArray(cIntersect) && cIntersect.length > 0) {
      send.message("Build geometry");
      cIntersectMultiPolygon = multiPolygon(cIntersect);
      send.message("Compute area");
      area = getArea(cIntersectMultiPolygon);
    }
  }
  send.area(area);
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
  return isArray(a) && isArray(b) && a.length > 0 && b.length > 0;
}

/* Parse & stringify Well-Known Text (WKT) into GeoJSON
 *  @param {Array} res Array of WKT geometries (as string)
 *  @return {Boolean} GeoJSON geometry object or null if parse fails
 */
function wktArrayToJson(a) {
  var out = {};
  a = isArray(a) ? a[0] : null;
  out = a && wktToJson(a);
  return out;
}
