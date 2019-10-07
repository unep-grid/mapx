const u = require('./utils.js');
const v = require('validator');

var arrayOperator = {
  ALL: '?&',
  ANY: '?|',
  OR : '?|',
  AND : '?&'
};
let keysChoices = [
  '*',
  'id',
  'editor',
  'date_modified',
  'data',
  'type',
  'pid',
  'project',
  'readers',
  'editors',
  '_edit',
  '_title',
  '_title_project',
  '_source',
  '_meta'
];
let keysChoicesPublic = [
  '*',
  'id',
  'editor',
  'date_modified',
  'data',
  'type',
  'pid',
  'project',
  'readers',
  'editors',
  '_title',
  '_title_project',
  '_meta'
];
let roles = ['admin', 'publisher', 'member', 'public'];
let types = ['cc', 'sm', 'rt', 'vt'];

let validateRules = [
  {
    key: 'idUser',
    test: (d) => (v.isNumeric(d) ? d * 1 : u.stop('Id user not valid'))
  },
  {
    key: 'idProject',
    test: (d) => (d && d.length === 22 ? d : u.stop('Id project not valid'))
  },
  {
    key: 'idProjectOption',
    test: (d) => (d && d.length === 22 ? d : '')
  },
  {
    key: 'idViews',
    test: (d) => {
      d = u.asArray(d);
      return d.reduce((a, x) => a && x.length === 20, true)
        ? d
        : stop('View id not valid');
    }
  },
  {
    key: 'idCollections',
    test: (d) => {
      d = u.asArray(d);
      return d.reduce((a, x) => a && v.isLength(x, {min: 1, max: 200}), true)
        ? d
        : u.stop('Collections id not valid');
    }
  },
  {
    key: 'collectionsFilterOperator',
    test: (d) => {
      let def = 'ANY';
      d = d || def;
      return arrayOperator[d] || arrayOperator[def];
    }
  },
  {
    key: 'selectKeys',
    test: (d) => {
      d = u.asArray(d);
      return d.reduce((a, x) => a && keysChoices.indexOf(x) > -1, true)
        ? d.length === 0 ? keysChoices[0] : d
        : u.stop('Some select keys are not valid');
    }
  },
  {
    key: 'idTypes',
    test: (d) => {
      d = u.asArray(d);
      return d.reduce((a, x) => a && types.indexOf(x) > -1, true)
        ? d.length === 0 ? types : d
        : u.stop('Some types are not valid');
    }
  },
  {
    key: 'selectKeysPublic',
    test: (d) => {
      d = u.asArray(d);
      return d.reduce((a, x) => a && keysChoicesPublic.indexOf(x) > -1, true)
        ? d.length === 0 ? keysChoicesPublic[0] : d
        : u.stop('Some select keys are not valid');
    }
  },
  {
    key: 'roleMax',
    test: (d) => (d ? (roles.indexOf(d) > -1 ? d : roles[0]) : roles[0])
  },
  {
    key: 'language',
    test: (d) => {
      return !d ? 'en' : d.length !== 2 ? u.stop('Invalid language code') : d;
    }
  },
  {
    key: 'publicOnly',
    test: (d) => (!d ? false : d === 'true' || d === true)
  }
];

const validate = u.validator(validateRules);

exports.validate = validate;

