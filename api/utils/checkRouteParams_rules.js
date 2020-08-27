const asArray = require('./utils.js').asArray;
const mx_valid = require('@fxi/mx_valid');
const defaults = require.main.require('./settings').validation_defaults;

let isValid = false;

/**
 * NOTE: put this in .env or config file
 */
const idUserPublic = defaults.users.id_public;
const viewKeys = defaults.views.keys_out;
const viewKeysPublic = defaults.views.keys_out_public;
const arrayOperators = defaults.db.array_operators;
const types = defaults.views.types;
const roles = defaults.users.roles;
const tableNotQueryable = defaults.tables.name_not_queryable;
const tableAttrNotQueryable = defaults.tables.attr_not_queryable;

const rules = [
  {
    /**
     * Generic boolean
     */
    key: ['noCache', 'binsCompute', 'publicOnly'],
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
    key: ['date'],
    test: (d) => {
      isValid = mx_valid.isDateString(d);
      return {
        valid: isValid,
        value: d
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
    key: ['email'],
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
        valid: mx_valid.isStringRange(d, 2, 2),
        value: d || 'en'
      };
    }
  },
  {
    key: ['token', 'title', 'titlePrefix', 'titleFuzzy'],
    test: (d) => {
      return {
        valid: mx_valid.isStringRange(d, 1),
        value: d
      };
    }
  }
];

exports.rules = rules;
exports.getRule = function(key) {
  return rules.find((r) => {
    if (r.key instanceof Array) {
      return r.key.indexOf(key) > -1;
    } else {
      return r.key === key;
    }
  });
};
