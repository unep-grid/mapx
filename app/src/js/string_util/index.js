const diacTable = require('./table_diacritics.json');

/**
 * Remove diacritics
 * @note https://jsperf.com/diacritics/47
 * @param {string} Character string to convert
 * @return promise
 */
export function cleanDiacritic(str) {
  return str.replace(/[À-ž]/g, function(ch) {
    return diacTable[ch.charCodeAt(0)] || ch;
  });
}


/**
* Wrapper around levenshtein : clean before compute distance
 * @param {string} String a
 * @param {string} String b
 * @return {Number} Distance from 0 to 1, neut
*/ 
export function levenshtein(a, b) {
  // only keep meaningfull characters
  a = a.replace(/[^0-9A-zÀ-ÿ\,\&\|\$]/g, '').toLowerCase();
  b = b.replace(/[^0-9A-zÀ-ÿ\,\&\|\$]/g, '').toLowerCase();

  a = cleanDiacritic(a);
  b = cleanDiacritic(b);

  const l = a.length + b.length;

  return 1 - levenshteinDistance(a, b) / l;
}

/**
 * Get Levenshtein distance by Gustaf Andersson
 * @note https://jsperf.com/levenshtein-distance/25
 * @param {string} String a
 * @param {string} String b
 */
function levenshteinDistance(s, t) {
  if (s === t) {
    return 0;
  }
  var n = s.length,
    m = t.length;
  if (n === 0 || m === 0) {
    return n + m;
  }
  var x = 0,
    y,
    a,
    b,
    c,
    d,
    g,
    h;
  var p = new Array(n);
  for (y = 0; y < n; ) {
    p[y] = ++y;
  }

  for (; x + 3 < m; x += 4) {
    var e1 = t.charCodeAt(x);
    var e2 = t.charCodeAt(x + 1);
    var e3 = t.charCodeAt(x + 2);
    var e4 = t.charCodeAt(x + 3);
    c = x;
    b = x + 1;
    d = x + 2;
    g = x + 3;
    h = x + 4;
    for (y = 0; y < n; y++) {
      var f = s.charCodeAt(y);
      a = p[y];
      if (a < c || b < c) {
        c = a > b ? b + 1 : a + 1;
      } else {
        if (e1 !== f) {
          c++;
        }
      }

      if (c < b || d < b) {
        b = c > d ? d + 1 : c + 1;
      } else {
        if (e2 !== f) {
          b++;
        }
      }

      if (b < d || g < d) {
        d = b > g ? g + 1 : b + 1;
      } else {
        if (e3 !== f) {
          d++;
        }
      }

      if (d < g || h < g) {
        g = d > h ? h + 1 : d + 1;
      } else {
        if (e4 !== f) {
          g++;
        }
      }
      p[y] = h = g;
      g = d;
      d = b;
      b = c;
      c = a;
    }
  }

  for (; x < m; ) {
    var e = t.charCodeAt(x);
    c = x;
    d = ++x;
    for (y = 0; y < n; y++) {
      a = p[y];
      if (a < c || d < c) {
        d = a > d ? d + 1 : a + 1;
      } else {
        if (e !== s.charCodeAt(y)) {
          d = c + 1;
        } else {
          d = c;
        }
      }
      p[y] = d;
      c = a;
    }
    h = d;
  }

  return h;
}
