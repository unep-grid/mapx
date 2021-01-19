/* jshint  esversion:6  */

export function validateMetadataView(opt) {
  opt = opt || {};
  const view = opt.view || {};
  const forceUpdateMeta = opt.forceUpdateMeta || false;
  const h = mx.helpers;
  const type = h.path(view, 'type');
  const isRt = type === 'rt';
  const isVt = type === 'vt';

  const out = {
    type: type,
    validated: false,
    valid: null
  };

  /**
   * Type raster tiles / wms
   */
  if (isRt) {
    const meta = h.path(view, 'data.source.meta');
    if (meta) {
      /**
       * Validate rt metadata
       */
      const results = validateMetadataTests(meta);
      out.validated = true;
      out.valid = h.all(results.tests.map((t) => t.valid));
      out.results = results;
    } else {
      /**
       * If no metadata (views < mapx 1.8), use urlMetadata
       */
      out.valid = h.isUrl(h.path(view, 'data.source.urlMetadata', ''));
      const reasons = [];

      if (!out.valid) {
        reasons.push('validate_meta_invalid_external_link');
      }

      out.validated = true;
      out.results = {
        tests: [
          {
            type: 'url',
            valid: out.valid,
            reasons: reasons
          }
        ]
      };
    }
    return Promise.resolve(out);
  }

  /**
   * Type vector tiles
   */
  if (isVt) {
    return mx.helpers
      .addSourceMetadataToView({
        view: view,
        forceUpdateMeta: forceUpdateMeta
      })
      .then((meta) => {
        const attr = h.path(view, 'data.attribute.name');
        const results = validateMetadataTests(meta, attr);
        out.validated = true;
        out.valid = h.all(results.tests.map((t) => t.valid));
        out.results = results;
        return out;
      });
  }

  /**
   * Type not handled
   */

  return Promise.resolve(out);
}

/**
 * Validate metadata
 * @param {Object} meta MapX metadata
 * @return {Array} array of tests
 */
export function validateMetadataTests(meta, attr) {
  const v = mx.settings.validation.input.nchar;
  const tests = [];

  if(attr){
      tests.push(validateAttribute(
      meta,
      attr,
      v.sourceAttributesDesc.min,
      v.sourceAttributesDesc.max
    ));
  }

  tests.push(...[
    validateAbstract(meta, v.sourceAbstract.min, v.sourceAbstract.max),
    validateTitle(meta, v.sourceTitle.min, v.sourceTitle.max),
    validateKeywords(meta, v.sourceKeywords.min, v.sourceKeywords.max),
    validateKeywordsM49(meta, v.sourceKeywords.min, v.sourceKeywords.max),
    validateContact(meta),
    validateIssuance(meta),
    validateSource(meta),
    validateLicense(meta, v.sourceLicense.min, v.sourceLicense.max)
  ]);

  return {
    tests: tests,
    meta: meta
  };
}
/**
 * Validate attributes
 * - At least n letter in english description
 * @param {Object} MapX metadata object
 * @param {Integer} min Number of character default 3
 * @param {Integer} max Number of character default 10
 * @return {Object} Validation result : type, valid, reason
 */
function validateAttribute(meta, attr, min, max) {
  min = min || 3;
  max = max || 10;
  const h = mx.helpers;
  const reasons = [];
  const attributes = h.path(meta, 'text.attributes', {});
  // if no attr given, get the first one.
  attr = attr || Object.keys(attributes)[0];
  const str = h.path(attributes, attr + '.en', '');
  const hasAttr = h.isStringRange(attr) && h.isStringRange(str, min, max);

  if (!hasAttr) {
    reasons.push('validate_meta_invalid_attribute');
  }

  const valid = hasAttr;

  return {
    type: 'validate_meta_attribute',
    valid: valid,
    reasons: reasons
  };
}

/**
 * Validate abstract
 * - At least n letter in english abstract
 * @param {Object} MapX metadata object
 * @param {Integer} min Number of character default 3
 * @param {Integer} max Number of character default 10
 * @return {Object} Validation result : type, valid, reason
 */
function validateAbstract(meta, min, max) {
  min = min || 3;
  max = max || 10;
  const reasons = [];
  const h = mx.helpers;
  const str = h.path(meta, 'text.abstract.en', '');
  const hasAbstract = h.isStringRange(str, min, max);

  if (!hasAbstract) {
    reasons.push('validate_meta_invalid_abstract');
  }

  return {
    type: 'validate_meta_abstract',
    valid: hasAbstract,
    reasons: reasons
  };
}

/**
 * Validate title
 * - At least n letter in english title
 * @param {Object} MapX metadata object
 * @param {Integer} min Number of character default 3
 * @param {Integer} max Number of character default 10
 * @return {Object} Validation result : type, valid, reason
 */
function validateTitle(meta, min, max) {
  min = min || 3;
  max = max || 10;
  const reasons = [];
  const h = mx.helpers;
  const str = h.path(meta, 'text.title.en', '');
  const hasTitle = h.isStringRange(str, min, max);

  if (!hasTitle) {
    reasons.push('validate_meta_invalid_title');
  }

  return {
    type: 'validate_meta_title',
    valid: hasTitle,
    reasons: reasons
  };
}

/**
 * Validate keywords
 * - At least one keyword
 * @param {Object} MapX metadata object
 * @param {Integer} min Number of character default 3
 * @param {Integer} max Number of character default 10
 * @return {Object} Validation result : type, valid, reason
 */
function validateKeywords(meta, min, max) {
  min = min || 3;
  max = max || 10;
  const reasons = [];
  const h = mx.helpers;
  const keywords = h.path(meta, 'text.keywords.keys', []);
  const hasKeywords = !h.isEmpty(keywords);
  const hasValidKeywords = h.all(
    keywords.map((k) => h.isStringRange(k, min, max))
  );

  if (!hasKeywords) {
    reasons.push('validate_meta_no_keyword');
  }

  if (!hasValidKeywords) {
    reasons.push('validate_meta_invalid_keyword');
  }

  return {
    type: 'validate_meta_keyword',
    valid: hasKeywords,
    reasons: reasons
  };
}

/**
 * Validate m49 keywords
 * - At least one m49 keyword
 * @param {Object} MapX metadata object
 * @param {Integer} min Number of character default 3
 * @param {Integer} max Number of character default 10
 * @return {Object} Validation result : type, valid, reason
 */
function validateKeywordsM49(meta, min, max) {
  min = min || 3;
  max = max || 10;
  const reasons = [];
  const h = mx.helpers;
  const keywords = h.path(meta, 'text.keywords.keys_m49', []);
  const hasKeywords = !h.isEmpty(keywords);
  const hasValidKeywords = h.all(
    keywords.map((k) => h.isStringRange(k, min, max))
  );

  if (!hasKeywords) {
    reasons.push('validate_meta_no_keyword');
  }

  if (!hasValidKeywords) {
    reasons.push('validate_meta_invalid_keyword');
  }

  return {
    type: 'validate_meta_keyword_m49',
    valid: hasKeywords,
    reasons: reasons
  };
}

/**
 * Validate contacts
 * - At least one contact item
 * - All contact email valids
 * @param {Object} MapX metadata object
 * @return {Object} Validation result : type, valid, reason
 */
function validateContact(meta) {
  const reasons = [];
  const h = mx.helpers;
  const contacts = h.path(meta, 'contact.contacts', []);
  const hasContact = !h.isEmpty(contacts);
  const hasValidContact = h.all(contacts.map((c) => h.isEmail(c.email)));

  if (!hasContact) {
    reasons.push('validate_meta_no_contact');
  }
  if (!hasValidContact) {
    reasons.push('validate_meta_invalid_contact_email');
  }

  const valid = h.isEmpty(reasons);

  return {
    type: 'validate_meta_contact',
    valid: valid,
    reasons: reasons
  };
}
/**
 * Validate issueance
 * - Date of release must be greater than year 1
 * - At least n letters in periodicity
 * - Date of modification must be greater than year 1
 * @param {Object} MapX metadata object
 * @return {Object} Validation result : type, valid, reason
 */
function validateIssuance(meta) {
  const h = mx.helpers;
  const reasons = [];

  const hasPeriodicity = h.isStringRange(
    h.path(meta, 'temporal.issuance.periodicity', ''),
    3
  );
  const hasReleasedAt = h.isDateString(
    h.path(meta, 'temporal.issuance.released_at', '')
  );
  const hasModifiedAt = h.isDateString(
    h.path(meta, 'temporal.issuance.modified_at', '')
  );

  if (!hasPeriodicity) {
    reasons.push('validate_meta_invalid_issuance_periodicity');
  }
  if (!hasReleasedAt) {
    reasons.push('validate_meta_invalid_issuance_released_at');
  }
  if (!hasModifiedAt) {
    reasons.push('validate_meta_invalid_issuance_modified_at');
  }

  const valid = h.isEmpty(reasons);

  return {
    type: 'validate_meta_issuance',
    valid: valid,
    reasons: reasons
  };
}
/**
 * Validate licensing
 * - At least one license item
 * - All license should have at least n character
 * @param {Object} MapX metadata object
 * @param {Integer} min Number of character default 3
 * @param {Integer} max Number of character default 10
 * @return {Object} Validation result : type, valid, reason
 */
function validateLicense(meta, min, max) {
  const reasons = [];
  min = min || 3;
  max = max || 10;

  const h = mx.helpers;
  const licenses = h.path(meta, 'license.licenses', []);
  const hasLicense = !h.isEmpty(licenses);
  const hasValidLicenses = h.all(
    licenses.map((l) => {
      return (
        h.isStringRange(l.text, min, max) && h.isStringRange(l.name, min, max)
      );
    })
  );

  if (!hasLicense) {
    reasons.push('validate_meta_no_license');
  }
  if (!hasValidLicenses) {
    reasons.push('validate_meta_invalid_license');
  }

  const valid = hasLicense && hasValidLicenses;

  return {
    type: 'validate_meta_license',
    valid: valid,
    reasons: reasons
  };
}

/**
 * Validate source.
 * - At least one source url
 * - All url shoud begin
 * @param {Object} MapX metadata object
 * @return {Object} Validation result : type, valid, reason
 */
function validateSource(meta) {
  const h = mx.helpers;
  const reasons = [];
  const sources = h.path(meta, 'origin.source.urls', []);
  const hasSources = !h.isEmpty(sources);
  const hasValidSources = h.all(sources.map((source) => h.isUrl(source.url)));

  if (!hasSources) {
    reasons.push('validate_meta_no_source');
  }
  if (!hasValidSources) {
    reasons.push('validate_meta_invalid_source');
  }

  const valid = hasSources && hasValidSources;

  return {
    type: 'validate_meta_source',
    valid: valid,
    reasons: reasons
  };
}

/**
 * Validation object to HTML
 */
export function validationMetadataTestsToHTML(results) {
  const tests = results.tests;
  const meta = results.meta;
  const h = mx.helpers;
  let elValidation = h.el('div');
  let noIssue = true;
  let elItem;
  let elEditorInfo;

  /**
   * For each test, display the result of the test
   */
  tests.forEach((t) => {
    if (t.reasons.length === 0) {
      return;
    }
    noIssue = false;
    elItem = h.el(
      'div',
      {
        class: ['mx-prop-group']
      },
      h.el('h4', {
        class: ['mx-prop-layer-title'],
        dataset: {
          lang_key: t.type
        }
      }),
      h.el(
        'ul',
        /**
         * For each reason, display the message in list
         */
        t.reasons.map((r) => {
          return h.el('li', {
            dataset: {
              lang_key: r
            }
          });
        })
      )
    );
    elValidation.appendChild(elItem);
  });

  /**
   * If there is no issue
   */
  if (noIssue) {
    elValidation = h.el(
      'div',
      h.el('i', {
        class: ['fa', 'fa-check']
      }),
      h.el('b', {
        dataset: {
          lang_key: 'validate_meta_no_issue'
        }
      })
    );
  }
  /**
   * Add editor info
   */
  if (meta && meta._emailEditor) {
    elEditorInfo = h.el(
      'div',
      h.el('hr'),
      h.el('h4', {
        dataset: {
          lang_key: 'source_last_editor_email'
        }
      }),
      h.el('p', meta._emailEditor)
    );
    elValidation.appendChild(elEditorInfo);
  }

  h.updateLanguageElements({
    el: elValidation
  });

  return elValidation;
}

/**
 * Schema to modal validation window
 */
export function validateMetadataModal(meta) {
  meta = meta.metadata ? meta.metadata : meta;
  const h = mx.helpers;
  const results = h.validateMetadataTests(meta);
  /**
   * Build a modal
   */
  h.getDictItem('validate_meta_title').then((title) => {
    h.modal({
      id: 'modal_validation_metadata',
      addBackground:true,
      replace: true,
      title: title,
      content: h.validationMetadataTestsToHTML(results)
    });
  });
}
