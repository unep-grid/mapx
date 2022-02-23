const isString = (a) => typeof a === 'string';
/**
 * This is a draft for handling error translation
 */
const errorsTranslate = [
  {
    /**
     * OGR error.
     */
    reg: `Can't transform coordinates, source layer has no`,
    en:
      `MapX can't find a proper SRS. Perhaps due to a missing or corrupted projection file or wrong 'sourceSrs' parameter. Please correct this.`
  }
];

const handleErrorText = (err) => {
  const lang = 'en';
  let out = err;
  if (isString(err)) {
    for (const e of errorsTranslate) {
      if (err.match(e.reg)) {
        out = e[lang];
      }
    }
  }

  return out;
};

export {handleErrorText};
