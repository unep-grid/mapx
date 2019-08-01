/* jshint esversion :6 */

export {getArrayStat, getArrayDiff, getArrayIntersect, getArrayDistinct};



/**
 * Clone an array
 * @param {Array} Source to clone
 */
function getArrayClone(arr) {
 return arr.slice(0);
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
    o.stat === 'quantile' &&
    o.percentile &&
    o.percentile.constructor === Array
  ) {
    o.stat = 'quantiles';
  }
  var arr = getArrayClone(o.arr);
  var stat = o.stat ? o.stat : 'max';
  var len_o = arr.length;
  var len = len_o;

  function sortNumber(a, b) {
    return a - b;
  }
  // https://gist.github.com/devinus/453520
  var numGroups = /(-?\d*\.?\d+)/g;

  var naturalSort = function(a, b) {
    var aa = String(a).split(numGroups),
      bb = String(b).split(numGroups),
      min = Math.min(aa.length, bb.length);

    for (var i = 0; i < min; i++) {
      var x = parseFloat(aa[i]) || aa[i].toLowerCase(),
        y = parseFloat(bb[i]) || bb[i].toLowerCase();
      if (x < y) {
        return -1;
      } else if (x > y) {
        return 1;
      }
    }

    return 0;
  };

  var opt = {
    sortNatural: function() {
      return arr.sort(naturalSort);
    },
    max: function() {
      var max = -Infinity;
      var v = 0;
      while (len--) {
        v = arr.pop();
        if (v > max) {
          max = v;
        }
      }
      return max;
    },
    min: function() {
      var min = Infinity;
      while (len--) {
        var v = arr.pop();
        if (v < min) {
          min = v;
        }
      }
      return min;
    },
    sum: function() {
      var sum = 0;
      while (len--) {
        sum += arr.pop();
      }
      return sum;
    },
    mean: function() {
      var sum = getArrayStat({
        stat: 'sum',
        arr: arr
      });
      return sum / len_o;
    },
    median: function() {
      var median = getArrayStat({
        stat: 'quantile',
        arr: arr,
        percentile: 50
      });
      return median;
    },
    quantile: function() {
      var result;
      arr.sort(sortNumber);
      o.percentile = o.percentile ? o.percentile : 50;
      var index = (o.percentile / 100) * (arr.length - 1);
      if (Math.floor(index) === index) {
        result = arr[index];
      } else {
        var i = Math.floor(index);
        var fraction = index - i;
        result = arr[i] + (arr[i + 1] - arr[i]) * fraction;
      }
      return result;
    },
    quantiles: function() {
      var quantiles = {};
      o.percentile.forEach(function(x) {
        var res = getArrayStat({
          stat: 'quantile',
          arr: arr,
          percentile: x
        });
        quantiles[x] = res;
      });
      return quantiles;
    },
    distinct: function() {
      return getArrayDistinct(arr);
    },
    diff: function() {},
    frequency: function() {
      var areObjects =
        arr[0] && typeof arr[0] === 'object' && arr[0].constructor === Object;
      var colNames = o.colNames;
      if (areObjects) {
        if (colNames.constructor !== Array){
          throw 'colnames must be array';
        }
        if (colNames.length === 0){
          colNames = Object.keys(arr[0]);
        }
      } else {
        colNames = getArrayStat({
          stat: 'distinct',
          arr: arr
        });
      }
      var table = {};
      var val;
      var colName;

      for (var j = 0, jL = colNames.length; j < jL; j++) {
        colName = colNames[j];
        table[colName] = areObjects ? {} : 0;
        for (var i = 0, iL = arr.length; i < iL; i++) {
          if (areObjects) {
            val = arr[i][colName] || null;
            table[colName][val] = table[colName][val] + 1 || 1;
          } else {
            if (arr[i] === colName){
              table[colName]++;
            }
          }
        }
      }
      return table;
    },
    sumBy: function() {
      var colNames = o.colNames;
      if (colNames.constructor !== Array){
        throw 'colnames must be array';
      }
      if (colNames.length === 0){
        colNames = Object.keys(arr[1]);
      }
      var table = {};
      var val, prevVal;
      var colName;
      for (var j = 0, jL = colNames.length; j < jL; j++) {
        colName = colNames[j];
        for (var i = 0, iL = arr.length; i < iL; i++) {
          val = arr[i][colName] || 0;
          prevVal = table[colName] || 0;
          table[colName] = prevVal + val;
        }
      }
      return table;
    }
  };

  return opt[stat](o);
}

/**
 * Get diff between two arrays. Return a not in b;
 * @param {Array} a Array to filter
 * @param {Array} b Array of reference
 */
function getArrayDiff(a, b) {
  var bSet = new Set(b);
  return a.filter(function(x) {
    return !bSet.has(x);
  });
}

/**
 * Get value present in both
 * @param {Array} a First array
 * @param {Array} b Second array
 */
function getArrayIntersect(a, b) {
  var bSet = new Set(b);
  return a.filter(function(x) {
    return bSet.has(x);
  });
}

/**
 * Deduplicate items
 * @param {Array} a First array
 */
function getArrayDistinct(a) {
  return Array.from(new Set(a));
}
