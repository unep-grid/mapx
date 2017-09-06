/*jshint esversion: 6 */

/**
* Remove diacritics
* @note https://jsperf.com/diacritics/47
* @param {string} Character string to convert
* @return promise
*/
export function cleanDiacritic(str){
  return System.import("../data/table_diacritics.json")
    .then(function(d){
      return str.replace(/[À-ž]/g, function(ch) {
        return d[ch.charCodeAt(0)] || ch;
    }); 
  });
}


