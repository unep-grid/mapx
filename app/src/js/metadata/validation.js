import { settings } from "./../settings";
import { path, all } from "./../mx_helper_misc.js";
import { el } from "../el/src/index.js";
import { getDictItem, updateLanguageElements } from "../language";
import { modal } from "../mx_helper_modal";
import {
  isEmail,
  isUrl,
  isEmpty,
  isStringRange,
  isDateString,
} from "../is_test";

import { getViewSourceMetadata } from "../metadata/utils.js";

/**
 * Validate metadata for a view
 * @param {Object} view View object
 * @return {Promise<{results: Object, valid:Boolean, validated:Boolean}>}
 */
export async function validateMetadataView(view) {
  const out = {
    validated: false,
    valid: false,
    results: {},
  };

  try {
    const attr = path(view, "data.attribute.name");
    const meta = await getViewSourceMetadata(view);
    out.results = validateMetadataTests(meta, attr);
    out.validated = true;
    out.valid = all(out.results.tests.map((t) => t.valid));
  } catch (e) {
    console.error("validateMetadataView error", e);
  }
  /**
   * Type not handled
   */
  return out;
}

/**
 * Validate metadata
 * @param {Object} meta MapX metadata
 * @return {Array} array of tests
 */
export function validateMetadataTests(metaAll, attr) {
  const v = settings.validation.input.nchar;
  const tests = [];

  if (attr) {
    tests.push(
      validateAttribute(
        metaAll[0],
        attr,
        v.sourceAttributesDesc.min,
        v.sourceAttributesDesc.max,
      ),
    );
  }

  for (const meta of metaAll) {
    tests.push(
      ...[
        validateAbstract(meta, v.sourceAbstract.min, v.sourceAbstract.max),
        validateTitle(meta, v.sourceTitle.min, v.sourceTitle.max),
        validateKeywords(meta, v.sourceKeywords.min, v.sourceKeywords.max),
        validateKeywordsM49(meta, v.sourceKeywords.min, v.sourceKeywords.max),
        validateContact(meta),
        validateIssuance(meta),
        validateSource(meta),
        validateLicense(meta, v.sourceLicense.min, v.sourceLicense.max),
      ],
    );
  }

  return {
    tests: tests,
    meta: metaAll,
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
  const reasons = [];
  const attributes = path(meta, "text.attributes", {});
  // if no attr given, get the first one.
  attr = attr || Object.keys(attributes)[0];
  const str = path(attributes, attr + ".en", "");
  const hasAttr = isStringRange(attr) && isStringRange(str, min, max);

  if (!hasAttr) {
    reasons.push("validate_meta_invalid_attribute");
  }

  const valid = hasAttr;

  return {
    type: "validate_meta_attribute",
    valid: valid,
    reasons: reasons,
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
  const str = path(meta, "text.abstract.en", "");
  const hasAbstract = isStringRange(str, min, max);

  if (!hasAbstract) {
    reasons.push("validate_meta_invalid_abstract");
  }

  return {
    type: "validate_meta_abstract",
    valid: hasAbstract,
    reasons: reasons,
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
  const str = path(meta, "text.title.en", "");
  const hasTitle = isStringRange(str, min, max);

  if (!hasTitle) {
    reasons.push("validate_meta_invalid_title");
  }

  return {
    type: "validate_meta_title",
    valid: hasTitle,
    reasons: reasons,
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
  const keywords = path(meta, "text.keywords.keys", []);
  const hasKeywords = !isEmpty(keywords);
  const hasValidKeywords = all(keywords.map((k) => isStringRange(k, min, max)));

  if (!hasKeywords) {
    reasons.push("validate_meta_no_keyword");
  }

  if (!hasValidKeywords) {
    reasons.push("validate_meta_invalid_keyword");
  }

  return {
    type: "validate_meta_keyword",
    valid: hasKeywords,
    reasons: reasons,
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
  const keywords = path(meta, "text.keywords.keys_m49", []);
  const hasKeywords = !isEmpty(keywords);
  const hasValidKeywords = all(keywords.map((k) => isStringRange(k, min, max)));

  if (!hasKeywords) {
    reasons.push("validate_meta_no_keyword");
  }

  if (!hasValidKeywords) {
    reasons.push("validate_meta_invalid_keyword");
  }

  return {
    type: "validate_meta_keyword_m49",
    valid: hasKeywords,
    reasons: reasons,
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
  const contacts = path(meta, "contact.contacts", []);
  const hasContact = !isEmpty(contacts);
  const hasValidContact = all(contacts.map((c) => isEmail(c.email)));

  if (!hasContact) {
    reasons.push("validate_meta_no_contact");
  }
  if (!hasValidContact) {
    reasons.push("validate_meta_invalid_contact_email");
  }

  const valid = isEmpty(reasons);

  return {
    type: "validate_meta_contact",
    valid: valid,
    reasons: reasons,
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
  const reasons = [];

  const hasPeriodicity = isStringRange(
    path(meta, "temporal.issuance.periodicity", ""),
    3,
  );
  const hasReleasedAt = isDateString(
    path(meta, "temporal.issuance.released_at", ""),
  );
  const hasModifiedAt = isDateString(
    path(meta, "temporal.issuance.modified_at", ""),
  );

  if (!hasPeriodicity) {
    reasons.push("validate_meta_invalid_issuance_periodicity");
  }
  if (!hasReleasedAt) {
    reasons.push("validate_meta_invalid_issuance_released_at");
  }
  if (!hasModifiedAt) {
    reasons.push("validate_meta_invalid_issuance_modified_at");
  }

  const valid = isEmpty(reasons);

  return {
    type: "validate_meta_issuance",
    valid: valid,
    reasons: reasons,
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

  const licenses = path(meta, "license.licenses", []);
  const hasLicense = !isEmpty(licenses);
  const hasValidLicenses = all(
    licenses.map((l) => {
      return isStringRange(l.text, min, max) && isStringRange(l.name, min, max);
    }),
  );

  if (!hasLicense) {
    reasons.push("validate_meta_no_license");
  }
  if (!hasValidLicenses) {
    reasons.push("validate_meta_invalid_license");
  }

  const valid = hasLicense && hasValidLicenses;

  return {
    type: "validate_meta_license",
    valid: valid,
    reasons: reasons,
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
  const reasons = [];
  const sources = path(meta, "origin.source.urls", []);
  const hasSources = !isEmpty(sources);
  const hasValidSources = all(sources.map((source) => isUrl(source.url)));

  if (!hasSources) {
    reasons.push("validate_meta_no_source");
  }
  if (!hasValidSources) {
    reasons.push("validate_meta_invalid_source");
  }

  const valid = hasSources && hasValidSources;

  return {
    type: "validate_meta_source",
    valid: valid,
    reasons: reasons,
  };
}

/**
 * Validation object to HTML
 */
export function validationMetadataTestsToHTML(results) {
  const tests = results.tests;
  const meta = results.meta;
  let elValidation = el("div");
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
    elItem = el(
      "div",
      {
        class: ["mx-prop-group"],
      },
      el("h4", {
        class: ["mx-prop-layer-title"],
        dataset: {
          lang_key: t.type,
        },
      }),
      el(
        "ul",
        /**
         * For each reason, display the message in list
         */
        t.reasons.map((r) => {
          return el("li", {
            dataset: {
              lang_key: r,
            },
          });
        }),
      ),
    );
    elValidation.appendChild(elItem);
  });

  /**
   * If there is no issue
   */
  if (noIssue) {
    elValidation = el(
      "div",
      el("i", {
        class: ["fa", "fa-check"],
      }),
      el("b", {
        dataset: {
          lang_key: "validate_meta_no_issue",
        },
      }),
    );
  }
  /**
   * Add editor info
   */
  if (meta && meta._emailEditor) {
    elEditorInfo = el(
      "div",
      el("hr"),
      el("h4", {
        dataset: {
          lang_key: "source_last_editor_email",
        },
      }),
      el("p", meta._emailEditor),
    );
    elValidation.appendChild(elEditorInfo);
  }

  updateLanguageElements({
    el: elValidation,
  });

  return elValidation;
}

/**
 * Schema to modal validation window
 */
export async function validateMetadataModal(meta) {
  const results = validateMetadataTests(meta);
  /**
   * Build a modal
   */
  const title = await getDictItem("validate_meta_title");

  modal({
    id: "modal_validation_metadata",
    addBackground: true,
    replace: true,
    title: title,
    content: validationMetadataTestsToHTML(results),
  });
}
