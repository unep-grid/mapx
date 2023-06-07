import { isUrl, isArray, isEmpty, isNotEmpty } from "./../is_test/index.js";
import { parseTemplate } from "./../mx_helper_misc.js";
import { settings } from "./../settings/index.js";
import { getVersion } from "./../mx_helper_app_utils.js";
/**
 * Extract SLD from Mapbox layers
 * .. and fix common issues
 * @param {Object} style Mapbox style
 * @return {Promise<Array>} Array of layers
 */
export async function mapboxToSld(style, opt) {
  const { MapboxStyleParser } = await import("geostyler-mapbox-parser");
  const { SldStyleParser } = await import("geostyler-sld-parser");

  try {
    opt = Object.assign(
      {},
      {
        mergeSymbolizers: true,
        fixFilters: true,
        fixImageCdn: true,
        fixIconSize: true,
        ignoreConversionErrors: true,
      },
      opt
    );

    const fixNumeric = !!style?.metadata?.type_all_numeric;
    const mapbox = new MapboxStyleParser();
    const sld = new SldStyleParser();

    mapbox.ignoreConversionErrors = opt.ignoreConversionErrors;

    const gstyle = await mapbox.readStyle(style, {});

    if (isArray(gstyle?.errors) && isNotEmpty(gstyle.errors)) {
      const errors = gstyle.errors.join(",");
      throw new Error(`Style had errors: ${errors}`);
    }

    if (opt.fixFilters) {
      geostylerFixFilters(gstyle, {
        fixNumeric: fixNumeric,
      });
    }

    if (opt.mergeSymbolizers) {
      geostylerFixDuplicate(gstyle);
    }

    if (opt.fixImageCdn) {
      geostylerFixImageCdn(gstyle);
    }

    if (opt.fixIconSize) {
      geostylerFixIconSize(gstyle);
    }

    const out = await sld.writeStyle(gstyle.output);

    return out.output;
  } catch (e) {
    console.warn(e);
  }
  return "";
}

/**
 * Merge symbolizers to avoid duplcated rules
 * @param {Object} GeoStyler style
 */
function geostylerFixDuplicate(gstyle) {
  const rules = gstyle?.output?.rules || [];

  /**
   * Merge duplicates
   */
  for (const rule of rules) {
    if (rule._duplicate) {
      continue;
    }
    for (const ruleCheck of rules) {
      if (rule !== ruleCheck && rule.name === ruleCheck.name) {
        rule.symbolizers.push(...ruleCheck.symbolizers);
        ruleCheck._duplicate = true;
      }
    }
  }

  let len = rules.length;
  while (len--) {
    const rule = rules[len];
    if (rule._duplicate) {
      rules.splice(len, 1);
    }
  }
}

/**
 * Replace sprite url by actual svg file url, using a cdn
 * @param {Object} GeoStyler style
 */
function geostylerFixImageCdn(gstyle) {
  const rules = gstyle?.output?.rules || [];
  for (const rule of rules) {
    for (const symbolizer of rule.symbolizers) {
      switch (symbolizer.kind) {
        case "Icon":
          const img = spriteToCdnLink(symbolizer?.image, {
            fill: symbolizer.color,
            dummyExt: ".svg", // converter expects .svg at the end...
          });
          if (isUrl(img)) {
            symbolizer.image = img.toString();
          }
          break;
        case "Fill":
          const gFill = symbolizer?.graphicFill;
          if (gFill) {
            const img = spriteToCdnLink(gFill?.image);
            if (isUrl(img)) {
              gFill.image = img.toString();
            }
          }
      }
    }
  }
}

/**
 * Fix icon sizes
 * @param {Object} GeoStyler style
 */
function geostylerFixIconSize(gstyle) {
  const rules = gstyle?.output?.rules || [];
  for (const rule of rules) {
    for (const symbolizer of rule.symbolizers) {
      switch (symbolizer.kind) {
        case "Icon":
          symbolizer.size = symbolizer.size * 10;
          break;
      }
    }
  }
}

/**
 * Convert a sprint string to CDN link
 * @param {String} sprite link, e.g. '/sprites/?name=geol_hatch_02'
 * @param {Object} params Search parameters e.g. {fill:'#FF0000'};
 * @return {String} url
 */
function spriteToCdnLink(str, params) {
  if (!str) {
    return;
  }
  const url = new URL(location.origin + str);
  const version = getVersion();
  const name = url.searchParams.get("name");
  if (!name) {
    return;
  }
  const path = `app/src/sprites/dist/svg/${name}.svg`;
  const cdnTemplate = settings.cdn.template;
  const urlImage = new URL(parseTemplate(cdnTemplate, { version, path }));
  if (params) {
    for (const p in params) {
      urlImage.searchParams.set(p, params[p]);
    }
  }
  return urlImage;
}

/*async function svgPathFill(url,color){*/
/*const resp = await fetch(url);*/
/*const svgStringOrig = await resp.text();*/
/*const svg = new DOMParser().parseFromString(svgStringOrig,'image/svg+xml');*/
/*const path = svg.querySelector("path");*/
/*path.setAttribute("style",`fill:${color}`);*/
/*const svgString = new XMLSerializer().serializeToString(svg);*/
/*const svgStringClean = encodeURIComponent(svgString);*/
/*const svgB64 = window.btoa(svgStringClean);*/
/*const imgString = `data:image/svg+xml;base64,${svgB64}`;*/
/*console.log(imgString);*/
/*return imgString;*/
/*}*/

/*
 * Fix / update geostyler output
 * This is a minimalist approach : no recursion or deep changes.
 *
 * 1) Mapbox VT requires "" for numeric null testing. Type issue: SLD,
 * then postgres will produce wrong requests.
 *
 * 2) Recent mapbox-gl use newer "expression" for filter and data driven
 * style, but geostyler parser only handle old system. Conversion is needed.
 *
 * Example
 * --------------------------------------
 * ["!=", ["get", "status"], ""],
 * ["==", ["get", "status"], "Completed"]
 * returns
 * ["==", "status", "Completed" ]
 * --------------------------------------
 * ["==", ["get", "status"], ""],
 * returns
 * ["==", "status", "" ]
 * --------------------------------------
 * ["==", ["get", "year"], ""]
 * returns
 * ["==","year", null]
 *
 * @param {Object} gstyle GeoStyler object
 * @param {Object} opt Options
 * @param {Boolean} opt.fixNumeric All rules apply to numeric attribute
 */
function geostylerFixFilters(gstyle, opt) {
  const opKeep = [">", ">=", "<", "<=", "==", "!"];
  const opCombi = ["&&", "||"];
  const opExpr = ["get", "has"];

  const isNum = opt.fixNumeric;

  for (const rule of gstyle.output.rules) {
    const filter_fix = [];
    const filters = rule.filter || [];
    let fCount = 0;
    for (const filter of filters) {
      /**
       * Handle combination operator
       */

      if (opCombi.includes(filter)) {
        filter_fix.push(filter);
        continue;
      }
      /**
       * Handle expression
       * ["==","x","y"]
       * ["==",["get","x"],"y"]
       */
      if (isArray(filter)) {
        if (opKeep.includes(filter[0])) {
          /**
           * Handle nested expr
           *           ↓
           * ["==",["get","x"],"y"]
           *
           * ⚠️  should have been handled previously via
           * 'simplifyExpression' (makeSimpleLayer),
           *  but if used directly...
           */
          if (isArray(filter[1])) {
            if (filter[1][0] === "has" && filter[0] === "!") {
              /**
               * ["!",["has",<attr>]]
               * ->
               * ["==",<attr>,null]
               */
              const filterNull = ["==", filter[1][1], null];
              filter.length = 0;
              filter.push(...filterNull);
            } else if (opExpr.includes(filter[1][0])) {
              filter[1] = filter[1][1];
            }
          }
          /**
           * Handle numeric: PostgreSQL requires correct type
           * ["==","x",""]
           * to
           * ["==","x",null]
           */
          const val = filter[2];
          if (isEmpty(val)) {
            filter[2] = null;
          } else {
            if (isNum) {
              filter[2] = val * 1;
            }
          }
          filter_fix.push(filter);
          fCount++;
        }
      }
    }

    if (fCount === 1) {
      /**
       * Handle single rule with one combin. op
       * ["&&",["==","x",""]]
       * to
       * ["==","x",""]
       */
      for (const filter of filter_fix) {
        if (isArray(filter)) {
          filter_fix.length = 0;
          filter_fix.push(...filter);
          break;
        }
      }
    }

    rule.filter.length = 0;
    rule.filter.push(...filter_fix);
  }

  return gstyle;
}
