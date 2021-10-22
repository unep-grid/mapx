/**
 * Set local module path
 * ( to avoid require.main.require or ../../mess)
 */
const moduleAlias = require('module-alias');
moduleAlias.addAliases({
  '@mapx': __dirname + '/modules/',
  '@root': __dirname
});
const {once, onceInterval} = require('@mapx/helpers');

/**
 * Rountines' scripts
 */

const migrate = require('@mapx/migrate');
const language = require('@mapx/language');
const {updateIndexes} = require('@mapx/search');
const {updateGeoIpTable} = require('@mapx/ip');

/*
 * Rename
 * - Logs use method name for printing (r.name),
 */
const updateDb = () => migrate.apply();
const updateLanguage = () => language.init();
const updateIndexesRoutine = () => updateIndexes({});
const updateGeoIpTableRoutine = () => updateGeoIpTable();

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
   */
  intervalMs: 1 * 60 * 60 * 1000,
  before: false
});
const optWeekly = Object.assign({}, optCommon, {
  /**
   * Each week
   */
  intervalMs: 1 * 7 * 24 * 60 * 60 * 1000,
  before: false
});

/**
 * Apply at start, once
 */
once(
  [
    updateDb,
    updateLanguage, 
    updateIndexesRoutine,
    updateGeoIpTableRoutine
  ],
  optCommon
);

/**
 * Apply at interval
 */
onceInterval([updateIndexesRoutine], optHourly);
onceInterval([updateGeoIpTableRoutine], optWeekly);



