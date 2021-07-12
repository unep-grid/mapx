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
const {updateIndexes} = require('@mapx/search');
const {once, onceInterval} = require('@mapx/helpers');

/*
 * Rename
 * - Logs use method name for printing (r.name),
 */
const updateDb = () => migrate.apply();
const updateLanguage = () => language.init();
const updateIndexesRoutine = () => updateIndexes({});

/**
 * Config
 */
const optCommon = {
  /**
   * Fails if passed 10 minutes
   * intervalMs: 10 * 60 * 1000,
   */
  timeoutMs: 10 * 60 * 1000,
  onSuccess: (cbs) => {
    const str = cbs.map((cb) => cb.name).join(',');
    console.log(`Update success for ${str}`);
  },
  onError: (cbs, e) => {
    const str = cbs.map((cb) => cb.name).join(',');
    console.error(`Update for ${str} had issue`, e);
  }
};
const optHourly = Object.assign({}, optCommon, {
  /**
   * Each hour
   * intervalMs: 1 * 60 * 60 * 1000,
   */
  intervalMs: 1 * 60 * 60 * 1000,
  before: false
});

/**
 * Apply
 */
once([updateDb, updateLanguage, updateIndexes], optCommon);
onceInterval([updateIndexesRoutine], optHourly);
