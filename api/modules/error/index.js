/**
 * This is a draft for handling error translation
 */
const errorsTranslate = [
  {
    /**
     * OGR error.
     */
    reg: "Can't transform coordinates, source layer has no",
    en: "MapX can't find a proper SRS. Perhaps due to a missing or corrupted projection file or wrong `sourceSrs` parameter. Please correct this."
  }
];

handleErrorText = function(err) {
  var out = err;
  var lang = 'en';
  if (typeof err === 'string') {
    errorsTranslate.forEach((e) => {
      if (err.match(e.reg)) {
        out = e[lang];
      }
    });
  }

  return out;
};

module.exports.handleErrorText = handleErrorText;
