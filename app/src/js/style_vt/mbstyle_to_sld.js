import { resolveSvgUrl } from "@unep-grid/mapx-style";
import { getApiUrl } from "./../api_routes/index.js";
import { isUrl, isArray, isEmpty, isNotEmpty } from "./../is_test/index.js";
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
        geomType: "point",
      },
      opt,
    );

    const fixNumeric = !!style?.metadata?.type_all_numeric;
    const styleSld = getMapboxStyleForSld(style, {
      geomType: opt.geomType,
    });
    const mapbox = new MapboxStyleParser();
    const sld = new SldStyleParser();

    mapbox.ignoreConversionErrors = opt.ignoreConversionErrors;
    const gstyle = await mapbox.readStyle(styleSld, {});

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

    return fixSldExternalGraphicFormat(out.output);
  } catch (e) {
    console.warn(e);
  }
  return "";
}

/**
 * Convert MapLibre style additions to a Mapbox/GeoStyler compatible style.
 * GeoStyler's Mapbox parser only accepts a single sprite URL string.
 * @param {Object} style Mapbox/MapLibre style
 * @param {Object} opt Options
 * @param {String} opt.geomType View geometry type
 * @return {Object} Cloned style compatible with GeoStyler
 */
export function getMapboxStyleForSld(style, opt) {
  const styleSld = cloneStyle(style);
  const sprite = getSpriteUrlForSld(styleSld?.sprite, opt);

  if (sprite) {
    styleSld.sprite = sprite;
  } else {
    delete styleSld.sprite;
  }

  return styleSld;
}

/**
 * Select a single sprite URL for GeoStyler from MapLibre's multi-sprite array.
 * @param {String|Array} sprite Style sprite value
 * @param {Object} opt Options
 * @param {String} opt.geomType View geometry type
 * @return {String|undefined} Sprite URL
 */
export function getSpriteUrlForSld(sprite, opt) {
  if (typeof sprite === "string") {
    return sprite;
  }
  if (!isArray(sprite)) {
    return;
  }

  const geomType = opt?.geomType;
  const idPreferred = geomType === "polygon" ? "patterns" : "default";
  const preferred = sprite.find((s) => s?.id === idPreferred);
  const fallbackDefault = sprite.find((s) => s?.id === "default");
  const fallbackAny = sprite.find((s) => typeof s?.url === "string");

  for (const item of [preferred, fallbackDefault, fallbackAny]) {
    if (typeof item?.url === "string") {
      return item.url;
    }
  }
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
 * Replace sprite url by actual versioned SVG file url, using the S3 proxy.
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
 * Convert a sprite string to an S3 proxy SVG link.
 * @param {String} sprite link, e.g. '/sprites/?name=geol_hatch_02'
 * @param {Object} params Search parameters e.g. {fill:'#FF0000'};
 * @return {String} url
 */
export function spriteToCdnLink(str, params) {
  if (!str || typeof str !== "string") {
    return;
  }
  const origin = globalThis.location?.origin || "http://localhost";
  const url = new URL(str, origin);
  const name = stripSpriteNamespace(url.searchParams.get("name"));

  if (!name) {
    return;
  }

  return new URL(
    resolveSvgUrl(name, {
      baseUrl: getApiUrl("/s3"),
      params,
    }),
  );
}

/**
 * Remove MapLibre sprite namespace prefix, e.g. patterns:t_b_lines_01.
 * @param {String} name Sprite name
 * @return {String} Bare sprite name
 */
export function stripSpriteNamespace(name) {
  if (!name || typeof name !== "string") {
    return name;
  }
  return name.split(":").pop();
}

/**
 * Fix GeoStyler SVG format detection when SVG URLs include query strings.
 * @param {String} sldString SLD XML string
 * @return {String} Fixed SLD XML string
 */
export function fixSldExternalGraphicFormat(sldString) {
  if (!sldString || typeof sldString !== "string") {
    return sldString;
  }
  const dom = new DOMParser().parseFromString(sldString, "application/xml");
  const parserError = dom.querySelector("parsererror");

  if (parserError) {
    return sldString;
  }

  const graphics = dom.querySelectorAll("ExternalGraphic, sld\\:ExternalGraphic");

  for (const graphic of graphics) {
    const resource = graphic.querySelector("OnlineResource, sld\\:OnlineResource");
    const href =
      resource?.getAttribute("xlink:href") || resource?.getAttribute("href");

    if (!isSvgHref(href)) {
      continue;
    }

    let format = graphic.querySelector("Format, sld\\:Format");
    if (!format) {
      format = dom.createElementNS(graphic.namespaceURI, "Format");
      graphic.appendChild(format);
    }
    format.textContent = "image/svg+xml";
  }

  return new XMLSerializer().serializeToString(dom);
}

function isSvgHref(href) {
  if (!href || typeof href !== "string") {
    return false;
  }
  try {
    const url = new URL(href, globalThis.location?.origin || "http://localhost");
    return url.pathname.endsWith(".svg");
  } catch (e) {
    return href.split("?")[0].endsWith(".svg");
  }
}

function cloneStyle(style) {
  if (!style) {
    return {};
  }
  return JSON.parse(JSON.stringify(style));
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
