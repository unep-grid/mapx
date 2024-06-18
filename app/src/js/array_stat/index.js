import { isNumeric, isArray, isEmpty } from "../is_test";

export { getArrayStat, getArrayDiff, getArrayIntersect, getArrayDistinct };

/**
 * Clone an array
 * @param {Array} Source to clone
 */
function getArrayClone(arr) {
  return arr.slice(0);
}

/**
 * Numeric sort
 * @param {Any} a First element
 * @param {Any} b Second element
 * @return {Integer} > 0 b before a, <0a before b, ===0 original order
 */
function sortNumber(a, b) {
  return a - b;
}

/**
 * Sorts an array based on the order of elements specified in another array.
 *
 * @param {Array} arr1 - The array to be sorted.
 * @param {Array} arr2 - The array that defines the sort order.
 * @returns {Array} - The sorted array.
 */
export function sortByOrder(arr1, arr2) {
  const orderMap = new Map();
  
  for (const [index, item] of arr2.entries()) {
    orderMap.set(item, index);
  }

  return arr1.sort((a, b) => orderMap.get(a) - orderMap.get(b));
}

/**
 *  Natural sort
 * @note https://gist.github.com/devinus/453520
 * @param {Any} a First element
 * @param {Any} b Second element
 * @return {Integer} > 0 b before a, <0a before b, ===0 original order
 */
const numGroups = /(-?\d*\.?\d+)/g;
function naturalSort(a, b) {
  const aa = String(a).split(numGroups),
    bb = String(b).split(numGroups),
    min = Math.min(aa.length, bb.length);

  for (var i = 0; i < min; i++) {
    const x = parseFloat(aa[i]) || aa[i].toLowerCase(),
      y = parseFloat(bb[i]) || bb[i].toLowerCase();
    if (x < y) {
      return -1;
    } else if (x > y) {
      return 1;
    }
  }

  return 0;
}

/* Get stat of an array
 * @param {Object} o options
 * @param {Array} o.arr Input array or array of object
 * @param {String} o.stat Stat string : min, max, mean, median, distinct, quantile, quantiles, sumyBy, frequenc or sortNatural. Default = max;
 * @param {Number|Array} o.percentile : percentile to use for quantile
 * @param {Array} o.colNames : array of column names for sortBy or frenquency stat.
 */
function getArrayStat(o) {
  if (
    o.arr === undefined ||
    o.arr.constructor !== Array ||
    o.arr.length === 0
  ) {
    return [];
  }

  if (
    o.stat === "quantile" &&
    o.percentile &&
    o.percentile.constructor === Array
  ) {
    o.stat = "quantiles";
  }
  const arr = getArrayClone(o.arr);
  const stat = o.stat ? o.stat : "max";
  const len_o = arr.length;
  const len = len_o;
  const opt = {
    sortNatural: function () {
      return arr.sort(naturalSort);
    },
    max: function () {
      const max = -Infinity;
      const v = 0;
      while (len--) {
        v = arr.pop();
        if (v > max) {
          max = v;
        }
      }
      return max;
    },
    min: function () {
      const min = Infinity;
      while (len--) {
        const v = arr.pop();
        if (v < min) {
          min = v;
        }
      }
      return min;
    },
    sum: function () {
      const sum = 0;
      while (len--) {
        sum += arr.pop();
      }
      return sum;
    },
    mean: function () {
      const sum = getArrayStat({
        stat: "sum",
        arr: arr,
      });
      return sum / len_o;
    },
    median: function () {
      const median = getArrayStat({
        stat: "quantile",
        arr: arr,
        percentile: 50,
      });
      return median;
    },
    quantile: function () {
      let result;
      arr.sort(sortNumber);
      o.percentile = o.percentile ? o.percentile : 50;
      const index = (o.percentile / 100) * (arr.length - 1);
      if (Math.floor(index) === index) {
        result = arr[index];
      } else {
        const i = Math.floor(index);
        const fraction = index - i;
        result = arr[i] + (arr[i + 1] - arr[i]) * fraction;
      }
      return result;
    },
    quantiles: function () {
      const quantiles = {};
      o.percentile.forEach(function (x) {
        const res = getArrayStat({
          stat: "quantile",
          arr: arr,
          percentile: x,
        });
        quantiles[x] = res;
      });
      return quantiles;
    },
    distinct: function () {
      return getArrayDistinct(arr);
    },
    diff: function () {},
    frequency: function () {
      const areObjects =
        arr[0] && typeof arr[0] === "object" && arr[0].constructor === Object;
      let colNames = o.colNames;
      if (areObjects) {
        if (colNames.constructor !== Array) {
          throw "colnames must be array";
        }
        if (colNames.length === 0) {
          colNames = Object.keys(arr[0]);
        }
      } else {
        colNames = getArrayStat({
          stat: "distinct",
          arr: arr,
        });
      }
      let val;
      let colName;

      const table = {};

      for (let j = 0, jL = colNames.length; j < jL; j++) {
        colName = colNames[j];
        table[colName] = areObjects ? {} : 0;
        for (let i = 0, iL = arr.length; i < iL; i++) {
          if (areObjects) {
            val = arr[i][colName] || null;
            table[colName][val] = table[colName][val] + 1 || 1;
          } else {
            if (arr[i] === colName) {
              table[colName]++;
            }
          }
        }
      }
      return table;
    },
    sumBy: function () {
      const colNames = o.colNames;
      if (colNames.constructor !== Array) {
        throw "colnames must be array";
      }
      if (colNames.length === 0) {
        colNames = Object.keys(arr[1]);
      }
      const table = {};
      let val, prevVal, colName;
      for (let j = 0, jL = colNames.length; j < jL; j++) {
        colName = colNames[j];
        for (let i = 0, iL = arr.length; i < iL; i++) {
          val = arr[i][colName] || 0;
          prevVal = table[colName] || 0;
          table[colName] = prevVal + val;
        }
      }
      return table;
    },
  };

  return opt[stat](o);
}

/**
 * Get diff between two arrays. Return a not in b;
 * @param {Array} a Array to filter
 * @param {Array} b Array of reference
 */
function getArrayDiff(a, b) {
  const bSet = new Set(b);
  const out = [];
  for (let item of a) {
    if (!bSet.has(item)) {
      out.push(item);
    }
  }
  return out;
}

/**
 * Get value present in both
 * @param {Array} a First array
 * @param {Array} b Second array
 */
function getArrayIntersect(a, b) {
  const bSet = new Set(b);
  const out = [];
  for (let item of a) {
    if (bSet.has(item)) {
      out.push(item);
    }
  }
  return out;
}

/**
 * Deduplicate items
 * @param {Array} a First array
 * @return {Array} Array with no duplicate
 */
function getArrayDistinct(a) {
  return Array.from(new Set(a));
}
