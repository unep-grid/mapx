/*jshint esversion: 6 , node: true */

const diacTable =  require("../data/string_processing/table_diacritics.json");

/**
 * Remove diacritics
 * @note https://jsperf.com/diacritics/47
 * @param {string} Character string to convert
 * @return promise
 */
export function cleanDiacritic(str){
  return str.replace(/[À-ž]/g, function(ch) {
    return diacTable[ch.charCodeAt(0)] || ch;
  });
}


