const asArray = require('./utils.js').asArray;
const validator = require('validator');
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

const rules = [
  {
    key: ['idUser', 'user'],
    test: (d) => {
      isValid = validator.isNumeric(d);
      return {
        valid: isValid,
        value: isValid ? d * 1 : idUserPublic
      };
    }
  },
  {
    key: ['idProject', 'project', 'idProjectExclude','idProjectOption'],
    test: (d) => {
      return {
        valid: validator.isLength(d, {min: 22, max: 22}),
        value: d
      };
    }
  },
  {
    key: ['idViews', 'views'],
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce(
        (a, x) => a && validator.isLength(x, {min: 20, max: 20}),
        true
      );
      return {
        valid: isValid,
        value: isValid ? d : []
      };
    }
  },
  {
    key: 'collections',
    test: (d) => {
      d = asArray(d);
      isValid = d.reduce(
        (a, x) => a && validator.isLength(x, {min: 1, max: 200}),
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
    key: 'selectKeys',
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
        valid: validator.isEmail(d),
        value: d
      };
    }
  },
  {
    key: 'language',
    test: (d) => {
      d = d.toLowerCase();
      return {
        valid: validator.isLength(d, {min: 2, max: 2}),
        value: d || 'en'
      };
    }
  },
  {
    key: 'publicOnly',
    test: (d) => {
      return {
        valid: validator.isBoolean(d),
        value: d === 'true' || d === true ? true : ''
      };
    }
  },
  {
    key: 'token',
    test: (d) => {
      return {
        valid: validator.isLength(d, {min: 1}),
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
