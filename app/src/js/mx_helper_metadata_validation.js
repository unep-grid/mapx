/* jshint  esversion:6  */

export function validateMetadataView(opt) {
  opt = opt || {};
  var view = opt.view || {};
  var forceUpdateMeta = opt.forceUpdateMeta || false;
  var h = mx.helpers;
  var type = h.path(view, 'type');
  var isRt = type === 'rt';
  var isVt = type === 'vt';

  var out = {
    type: type,
    validated: false,
    valid: null
  };

  /**
   * Type raster tiles / wms
   */
  if (isRt) {
    /*
     * TODO: wrap this in a propre validation function,
     * like VT metadata validation. E.g. validateSource
     */
    out.valid = h.isUrl(h.path(view, 'data.source.urlMetadata', ''));
    var reasons = [];

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
        var attr = h.path(view, 'data.attribute.name');
        var results = validateMetadataTests(meta, attr);
        out.validated = true;
        out.valid = mx.helpers.all(results.tests.map((t) => t.valid));
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
  var tests = [
    validateAttribute(meta, attr, 3),
    validateAbstract(meta, 3),
    validateTitle(meta, 3),
    validateKeywords(meta),
    validateContact(meta),
    validateIssuance(meta),
    validateSource(meta),
    validateLicense(meta, 3)
  ];

  return {
    tests: tests,
    meta: meta
  };
}
/**
 * Validate attributes
 * - At least n letter in english description
 * @param {Object} MapX metadata object
 * @param {Integer} n Number of character default 3
 * @return {Object} Validation result : type, valid, reason
 */
function validateAttribute(meta, attr, n) {
  n = n || 3;
  var h = mx.helpers;
  var reasons = [];
  var attributes = h.path(meta, 'text.attributes', {});
  // if no attr given, get the first one.
  attr = attr || Object.keys(attributes)[0];
  var str = h.path(attributes, attr + '.en', '');
  var hasAttr = h.isStringRange(attr) && h.isStringRange(str, n);

  if (!hasAttr) {
    reasons.push('validate_meta_invalid_attribute');
  }

  var valid = hasAttr;

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
 * @param {Number} n Number of character
 * @return {Object} Validation result : type, valid, reason
 */
function validateAbstract(meta, n) {
  n = n || 3;
  var reasons = [];
  var h = mx.helpers;
  var str = h.path(meta, 'text.abstract.en', '');
  var hasAbstract = h.isStringRange(str, n);

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
 * @param {Integer} n Number of character
 * @return {Object} Validation result : type, valid, reason
 */
function validateTitle(meta, n) {
  n = n || 3;
  var reasons = [];
  var h = mx.helpers;
  var str = h.path(meta, 'text.title.en', '');
  var hasTitle = h.isStringRange(str, n);

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
 * @param {Number} n Number of character
 * @return {Object} Validation result : type, valid, reason
 */
function validateKeywords(meta, n) {
  n = n || 3;
  var reasons = [];
  var h = mx.helpers;
  var keywords = h.path(meta, 'text.keywords.keys', []);
  var hasKeywords = !h.isEmpty(keywords);
  var hasValidKeywords = h.all(keywords.map((k) => h.isStringRange(k, n)));

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
 * Validate contacts
 * - At least one contact item
 * - All contact email valids
 * @param {Object} MapX metadata object
 * @return {Object} Validation result : type, valid, reason
 */
function validateContact(meta) {
  var reasons = [];
  var h = mx.helpers;
  var contacts = h.path(meta, 'contact.contacts', []);
  var hasContact = !h.isEmpty(contacts);
  var hasValidContact = h.all(contacts.map((c) => h.isEmail(c.email)));

  if (!hasContact) {
    reasons.push('validate_meta_no_contact');
  }
  if (!hasValidContact) {
    reasons.push('validate_meta_invalid_contact_email');
  }

  var valid = h.isEmpty(reasons);

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
  var h = mx.helpers;
  var reasons = [];

  var hasPeriodicity = h.isStringRange(
    h.path(meta, 'temporal.issuance.periodicity', ''),
    3
  );
  var hasReleasedAt = h.isDateString(
    h.path(meta, 'temporal.issuance.released_at', '')
  );
  var hasModifiedAt = h.isDateString(
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

  var valid = h.isEmpty(reasons);

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
 * @param {Integer} n Number of character
 * @return {Object} Validation result : type, valid, reason
 */
function validateLicense(meta, n) {
  var reasons = [];
  n = n || 3;
  var h = mx.helpers;
  var licenses = h.path(meta, 'license.licenses', []);
  var hasLicense = !h.isEmpty(licenses);
  var hasValidLicenses = h.all(
    licenses.map((l) => {
      return h.isStringRange(l.text, n) && h.isStringRange(l.name, n);
    })
  );

  if (!hasLicense) {
    reasons.push('validate_meta_no_license');
  }
  if (!hasValidLicenses) {
    reasons.push('validate_meta_invalid_license');
  }

  var valid = hasLicense && hasValidLicenses;

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
  var h = mx.helpers;
  var reasons = [];
  var sources = h.path(meta, 'origin.source.urls', []);
  var hasSources = !h.isEmpty(sources);
  var hasValidSources = h.all(sources.map((source) => h.isUrl(source.url)));

  if (!hasSources) {
    reasons.push('validate_meta_no_source');
  }
  if (!hasValidSources) {
    reasons.push('validate_meta_invalid_source');
  }

  var valid = hasSources && hasValidSources;

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
  var tests = results.tests;
  var meta = results.meta;
  var h = mx.helpers;
  var elValidation = h.el('div');
  var noIssue = true;
  var elItem;
  var elEditorInfo;

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
  var h = mx.helpers;
  var results = h.validateMetadataTests(meta);
  /**
   * Build a modal
   */
  h.getDictItem('validate_meta_title').then((title) => {
    h.modal({
      id: 'modal_validation_metadata',
      replace: true,
      title: title,
      content: h.validationMetadataTestsToHTML(results)
    });
  });
}
