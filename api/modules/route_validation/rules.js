import {
  isEmail,
  isViewId,
  isProjectId,
  isSafe,
  isArray,
  isString,
  isStringRange,
  isSourceId,
  isDateString,
  isNumeric,
  isBoolean
} from '@fxi/mx_valid';
import {isFormatValid} from '#mapx/file_formats';
import {asArray} from '#mapx/helpers';
import {settings} from '#root/settings';
const def = settings.validation_defaults;
let isValid = false;

export {getRule};

/**
 * NOTE: put this in .env or config file
 */
const idUserPublic = def.users.id_public;
const viewKeys = def.views.keys_out;
const viewKeysPublic = def.views.keys_out_public;
const arrayOperators = def.db.array_operators;
const types = def.views.types;
const roles = def.users.roles;
const languages = def.languages;
const search = def.search;
const tableNotQueryable = def.tables.name_not_queryable;
const tableAttrNotQueryable = def.tables.attr_not_queryable;

const rules = [
  {
    /**
     * Generic boolean
     */
    key: [
      'useCache',
      'binsCompute',
      'publicOnly',
      'isGuest',
      'encrypt',
      'allViews'
    ],
    test: (d) => {
      if (isString(d)) {
        switch (d) {
          case 'true':
            d = true;
            break;
          case 'false':
            d = false;
            break;
          default:
            d = !!d;
        }
      }

      isValid = isBoolean(d);

      return {
        valid: isValid,
        value: d
      };
    }
  },
  /*
   * Date  / time
   */
  {
    key: ['timestamp'],
    test: (d) => {
      isValid = isDateString(d) || (isNumeric(d) && d > 0);
      return {
        valid: isValid,
        value: isValid ? d * 1 : null
      };
    }
  },
  {
    key: ['validUntil'],
    test: (d) => {
      const dNow = new Date();
      const dValid = new Date(d);
      isValid = dValid > dNow;
      return {
        valid: isValid,
        value: isValid ? d * 1 : null
      };
    }
  },
  /*
   * Numeric
   */
  {
    key: ['maxRowsCount'],
    test: (d) => {
      isValid = isNumeric(d) && d > 0;
      return {
        valid: isValid,
        value: isValid ? d * 1 : 1e4
      };
    }
  },
  {
    key: ['binsNumber'],
    test: (d) => {
      isValid = isNumeric(d) && d > 0 && d <= 100; // see mx_helper_map_view_style.js
      return {
        valid: isValid,
        value: isValid ? d * 1 : 5
      };
    }
  },
  {
    key: ['maxByPage'],
    test: (d) => {
      isValid = isNumeric(d) && d > 0 && d <= 1000;
      return {
        valid: isValid,
        value: isValid ? d * 1 : 20
      };
    }
  },
  {
    key: ['pageNumber'],
    test: (d) => {
      isValid = isNumeric(d) && d >= 1; // see mx_helper_map_view_style.js
      return {
        valid: isValid,
        value: isValid ? d * 1 : 1
      };
    }
  },
  {
    key: ['nullValue'],
    test: (d) => {
      isValid = isSafe(d);
      if (!isValid) {
        d = null;
      }
      return {
        valid: isValid,
        value: d
      };
    }
  },
  {
    key: ['srid', 'epsgCode'],
    test: (d) => {
      isValid = isNumeric(d) && d >= 0;
      return {
        valid: isValid,
        value: isValid ? d * 1 : 4326
      };
    }
  },
  /**
   * Stats
   */
  {
    key: ['binsMethod'],
    test: (d) => {
      const methods = ['equal_interval', 'heads_tails', 'jenks', 'quantile'];
      const isValid = methods.indexOf(d) > -1;
      return {
        valid: isValid,
        value: isValid ? d : methods[0]
      };
    }
  },
  {
    key: ['stats'],
    test: (d) => {
      const methods = ['base', 'temporal', 'spatial', 'attributes'];
      if (isString(d)) d = d.split(',');
      const isValid =
        isArray(d) &&
        d.reduce((a, c) => (!a ? a : methods.indexOf(c) > -1), true);
      return {
        valid: isValid,
        value: isValid ? d : methods
      };
    }
  },
  /**
   * Various id : user, project, views...
   */
  {
    key: ['idUser', 'user'],
    test: (d) => {
      isValid = isNumeric(d);
      return {
        valid: isValid,
        value: isValid ? d * 1 : idUserPublic
      };
    }
  },
  {
    key: ['idProject', 'project', 'idProjectExclude', 'idProjectOption'],
    test: (d) => ({
      valid: isProjectId(d),
      value: d
    })
  },
  {
    key: ['idProjects'],
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce((a, id) => a && isProjectId(id), true);
      return {
        valid: isValid,
        value: d
      };
    }
  },
  {
    key: ['iso3codes'],
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce((a, id) => a && isStringRange(id, 3, 3), true);
      return {
        valid: isValid,
        value: d
      };
    }
  },
  {
    key: ['idSource'],
    test: (d) => {
      isValid = isSourceId(d) && !tableNotQueryable.includes(d);
      return {
        valid: isValid,
        value: d
      };
    }
  },
  {
    key: ['idViews', 'views'],
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce((a, x) => a && isViewId(x), true);
      return {
        valid: isValid,
        value: isValid ? d : []
      };
    }
  },
  {
    key: ['idConcepts'],
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce((a, x) => a && isStringRange(x, 1, 6), true);
      return {
        valid: isValid,
        value: isValid ? d : []
      };
    }
  },
  {
    key: ['idView'],
    test: (d) => {
      isValid = isViewId(d);
      return {
        valid: isValid,
        value: isValid ? d : null
      };
    }
  },
  /**
   * Query by collection
   * TODO: collections : should check for special char
   */
  {
    key: 'collections',
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce((a, x) => a && isStringRange(x, 1, 200), true);
      return {
        valid: isValid,
        value: d
      };
    }
  },
  {
    key: 'format',
    test: (d) => {
      isValid = isFormatValid(d);
      return {
        valid: isValid,
        value: isValid ? d : null
      };
    }
  },
  {
    key: 'collectionsSelectOperator',
    test: (d) => ({
      valid: true,
      value: arrayOperators[d] || arrayOperators.OR
    })
  },
  /**
   * Source attribute query
   */
  {
    key: ['idAttr', 'attribute', 'column'],
    test: (d) => {
      isValid = !tableAttrNotQueryable.includes(d);
      return {
        valid: isValid,
        value: isValid ? d : null
      };
    }
  },
  /**
   * Views by project : keys
   * TODO: selectKeysPublic not used ?
   */
  {
    key: 'selectKeysPublic',
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce((a, x) => a && viewKeysPublic.indexOf(x) > -1, true);
      return {
        valid: isValid,
        value: d.length === 0 ? [viewKeysPublic[0]] : d
      };
    }
  },
  {
    key: ['selectKeys', 'viewKeys'],
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce((a, x) => a && viewKeys.indexOf(x) > -1, true);
      return {
        valid: isValid,
        value: d.length === 0 ? [viewKeys[0]] : d
      };
    }
  },
  /**
   * Array of view type
   */
  {
    key: ['types', 'idTypes'],
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce((a, x) => a && types.indexOf(x) > -1, true);
      return {
        valid: isValid,
        value: d
      };
    }
  },
  /**
   * Roles
   */
  {
    key: ['roleMax', 'filterViewsByRoleMax', 'role'],
    test: (d) => ({
      valid: roles.indexOf(d) > -1,
      value: d || roles[0]
    })
  },
  /*
   * Language with fallback
   */
  {
    key: 'language',
    test: (d) => {
      d = d.toLowerCase();
      return {
        valid: languages.codes.indexOf(d) > -1,
        value: d || languages.default
      };
    }
  },
  /**
   * email / file fields (not safe for DB)
   */
  {
    key: ['email', 'from', 'to'],
    test: (d) => ({
      valid: isEmail(d),
      value: d
    })
  },

  {
    key: [
      'filename',
      'title',
      'subject',
      'subtitle',
      'subjectPrefix',
      'content'
    ],
    test: (d) => {
      const isValid = isStringRange(d, 1, 10000);
      return {
        valid: isValid,
        value: d
      };
    }
  },
  /**
   * Search in db : avoid special char
   */
  {
    key: [
      'titlePrefix',
      'titleFuzzy',
      'titleRegex',
      'searchQuery',
      'searchText',
      'name',
      'code'
    ],
    test: (d) => {
      const notAllowed = /[_;'"]/;
      const isValid = !notAllowed.test(d) && isStringRange(d, 1, 200);
      return {
        valid: isValid,
        value: d
      };
    }
  },
  /**
   * Token
   */
  {
    key: ['idSocket', 'token'],
    test: (d) => ({
      valid: isStringRange(d, 1, 600),
      value: d
    })
  },
  /*
   * Search index
   */
  {
    key: ['searchIndexName'],
    test: (d) => {
      d = d || search.index;
      return {
        valid: search.indices.indexOf(d) > -1,
        value: d
      };
    }
  }
];

function getRule(key) {
  return rules.find((r) => {
    if (isArray(r.key)) {
      return r.key.indexOf(key) > -1;
    } else {
      return r.key === key;
    }
  });
}
