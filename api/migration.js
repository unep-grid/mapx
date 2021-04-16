/**
 * Set local module path
 * ( to avoid require.main.require or ../../mess)
 */
const moduleAlias = require('module-alias');
moduleAlias.addAliases({
  '@mapx': __dirname + '/modules/',
  '@root': __dirname
});
const migrate = require('@mapx/migrate');
const language = require('@mapx/language');
const {updateIndex} = require('@mapx/meili');
const {once, onceInterval} = require('@mapx/helpers');

/*
 * Rename
 * - Logs use method name for printing (r.name),
 */
const updateDb = () => migrate.apply();
const updateLanguage = () => language.init();
const updateIndexes = () => updateIndex();

/**
 * Config
 */
const optCommon = {
  timeoutMs: 1 * 60 * 1000,
  onSuccess: (r) => {
    console.log(`Update success for ${r.name}`);
  },
  onError: (r, e) => {
    console.error(`Update failed for ${r.name}`, e);
  }
};
const optHourly = Object.assign({}, optCommon, {
  intervalMs: 10 * 60 * 60 * 1000
  //intervalMs: 1 * 60 * 60 * 1000
});

/**
 * Apply
 */
once([updateDb, updateLanguage], optCommon);
onceInterval([updateIndexes], optHourly);
