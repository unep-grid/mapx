import { isArray, isEmpty,} from "./../is_test/index.js";
/**
 * Extract layers from view
 * @param {String|Object} v id of the view or view
 * @return {Promise<Array>} Array of layers
 */

export async function mapboxToSld(style, opt) {
  const { MapboxStyleParser } = await import("geostyler-mapbox-parser");
  const { SldStyleParser } = await import("geostyler-sld-parser");

  opt = Object.assign({}, { fixFilters: true }, opt);

  const fixNumeric = !!style?.metadata?.type_all_numeric;
  const mapbox = new MapboxStyleParser();
  const sld = new SldStyleParser();
  const gstyle = await mapbox.readStyle(style);

  if (opt.fixFilters) {
    geostylerFixFilters(gstyle, {
      fixNumeric: fixNumeric,
    });
  }
  const out = await sld.writeStyle(gstyle.output);
  return out.output;
}

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
  const opKeep = [">", ">=", "<", "<=", "=="];
  const opCombi = ["&&", "||"];
  const opExpr = ["get"];

  const isNum = opt.fixNumeric;

  for (const rule of gstyle.output.rules) {
    const filter_fix = [];
    let fCount = 0;
    for (const filter of rule.filter) {
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
           */
          if (isArray(filter[1])) {
            if (opExpr.includes(filter[1][0])) {
              filter[1] = filter[1][1];
            }
          }
          /**
           * Handle numeric: PostgreSQL requires correct type
           * ["==","x",""]
           * to
           * ["==","x",null]
           */
          if (isNum) {
            const val = filter[2];
            if (isEmpty(val)) {
              filter[2] = null;
            } else {
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
