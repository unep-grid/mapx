const {asArray} = require('@mapx/helpers');
const {validation_defaults} = require('@root/settings');
const mx_valid = require('@fxi/mx_valid');
const def = validation_defaults;
let isValid = false;

module.exports = {
  getRule
};

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
    key: ['useCache', 'binsCompute', 'publicOnly', 'isGuest', 'encrypt'],
    test: (d) => {
      if (mx_valid.isString(d)) {
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

      isValid = mx_valid.isBoolean(d);

      return {
        valid: isValid,
        value: d
      };
    }
  },
  {
    key: ['timestamp'],
    test: (d) => {
      isValid = mx_valid.isDateString(d) || (mx_valid.isNumeric(d) && d > 0);
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
  {
    key: ['maxRowsCount'],
    test: (d) => {
      isValid = mx_valid.isNumeric(d) && d > 0;
      return {
        valid: isValid,
        value: isValid ? d * 1 : 1e4
      };
    }
  },
  {
    key: ['binsNumber'],
    test: (d) => {
      isValid = mx_valid.isNumeric(d) && d > 0 && d <= 100; // see mx_helper_map_view_style.js
      return {
        valid: isValid,
        value: isValid ? d * 1 : 5
      };
    }
  },
  {
    key: ['maxByPage'],
    test: (d) => {
      isValid = mx_valid.isNumeric(d) && d > 0 && d <= 100; // see mx_helper_map_view_style.js
      return {
        valid: isValid,
        value: isValid ? d * 1 : 20
      };
    }
  },
  {
    key: ['pageNumber'],
    test: (d) => {
      isValid = mx_valid.isNumeric(d) && d >= 1; // see mx_helper_map_view_style.js
      return {
        valid: isValid,
        value: isValid ? d * 1 : 1
      };
    }
  },
  {
    key: ['nullValue'],
    test: (d) => {
      isValid = mx_valid.isSafe(d);
      if(!isValid){
        d = null;
      }
      return {
        valid: isValid,
        value: d
      };
    }
  },
  {
    key: ['srid'],
    test: (d) => {
      isValid = mx_valid.isNumeric(d) && d >= 0;
      return {
        valid: isValid,
        value: isValid ? d * 1 : 4326
      };
    }
  },
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
      d = mx_valid.isString(d) ? d.split(',') : d;
      const isValid =
        mx_valid.isArray(d) &&
        d.reduce((a, c) => (a === false ? a : methods.indexOf(c) > -1), true);
      return {
        valid: isValid,
        value: isValid ? d : methods
      };
    }
  },
  {
    key: ['idUser', 'user'],
    test: (d) => {
      isValid = mx_valid.isNumeric(d);
      return {
        valid: isValid,
        value: isValid ? d * 1 : idUserPublic
      };
    }
  },
  {
    key: ['idProject', 'project', 'idProjectExclude', 'idProjectOption'],
    test: (d) => {
      return {
        valid: mx_valid.isProjectId(d),
        value: d
      };
    }
  },
  {
    key: ['idSource'],
    test: (d) => {
      return {
        valid: mx_valid.isSourceId(d) && tableNotQueryable.indexOf(d) === -1,
        value: d
      };
    }
  },
  {
    key: ['idViews', 'views'],
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce((a, x) => a && mx_valid.isViewId(x), true);
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
      isValid = d.reduce((a, x) => a && mx_valid.isStringRange(x, 1, 6), true);
      return {
        valid: isValid,
        value: isValid ? d : []
      };
    }
  },
  {
    key: ['idView'],
    test: (d) => {
      isValid = mx_valid.isViewId(d);
      return {
        valid: isValid,
        value: isValid ? d : null
      };
    }
  },
  {
    key: 'collections',
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce(
        (a, x) => a && mx_valid.isStringRange(x, 1, 200),
        true
      );
      return {
        valid: isValid,
        value: d
      };
    }
  },
  {
    key: 'collectionsSelectOperator',
    test: (d) => {
      return {
        valid: true,
        value: arrayOperators[d] || arrayOperators.OR
      };
    }
  },
  {
    key: ['idAttr', 'attribute', 'column'],
    test: (d) => {
      isValid = tableAttrNotQueryable.indexOf(d) === -1;
      return {
        valid: isValid,
        value: isValid ? d : null
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
  {
    key: ['types', 'idTypes'],
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce((a, x) => a && types.indexOf(x) > -1, true);
      return {
        valid: isValid,
        value: d.length === 0 ? types : d
      };
    }
  },
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
    key: ['roleMax', 'filterViewsByRoleMax', 'role'],
    test: (d) => {
      return {
        valid: roles.indexOf(d) > -1,
        value: d ? d : roles[0]
      };
    }
  },
  {
    key: ['email', 'from', 'to'],
    test: (d) => {
      return {
        valid: mx_valid.isEmail(d),
        value: d
      };
    }
  },
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
  {
    key: [
      'title',
      'titlePrefix',
      'titleFuzzy',
      'subject',
      'subtitle',
      'subjectPrefix',
      'searchQuery',
      'searchText',
      'name',
      'code'
    ],
    test: (d) => {
      return {
        valid: mx_valid.isStringRange(d, 1, 200),
        value: d
      };
    }
  },
  {
    key: ['content'],
    test: (d) => {
      return {
        valid: mx_valid.isStringRange(d, 1),
        value: d
      };
    }
  },
  {
    key: ['idSocket', 'token'],
    test: (d) => {
      return {
        valid: mx_valid.isStringRange(d, 1, 600),
        value: d
      };
    }
  },
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
    if (r.key instanceof Array) {
      return r.key.indexOf(key) > -1;
    } else {
      return r.key === key;
    }
  });
}
