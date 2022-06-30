import * as migrate from "#mapx/migrate";
import * as language from "#mapx/language";
import { updateIndexes } from "#mapx/search";
import { updateGeoIpTable } from "#mapx/ip";
import { updateGeoserver } from "#mapx/geoserver";
import { once, onceInterval } from "#mapx/helpers";

/**
 * Rountines' scripts
 */

/*
 * Rename
 * - Logs use method name for printing (r.name),
 */
const updateDbRoutine = () => migrate.apply();
const updateLanguageRoutine = () => language.init();
const updateIndexesRoutine = () => updateIndexes({});
const updateGeoIpTableRoutine = () => updateGeoIpTable();
const updateGeoserverRoutine = () => updateGeoserver();

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
    const str = cbs.map((cb) => cb.name).join(",");
    console.log(`Update success for ${str}`);
  },
  onError: (cbs, e) => {
    const str = cbs.map((cb) => cb.name).join(",");
    console.error(`Update for ${str} had issue`, e);
  },
};
const optHourly = {
  ...optCommon,

  /**
   * Each hour
   */
  intervalMs: 1 * 60 * 60 * 1000,

  before: false,
};
const optWeekly = {
  ...optCommon,

  /**
   * Each week
   */
  intervalMs: 1 * 7 * 24 * 60 * 60 * 1000,

  before: false,
};
const optDaily = {
  ...optCommon,
  /**
   * Each day
   */
  intervalMs: 1 * 24 * 60 * 60 * 1000,
  before: true,
};

/**
 * Apply at start, once
 */
once(
  [
    updateDbRoutine,
    updateLanguageRoutine,
    updateIndexesRoutine,
    updateGeoIpTableRoutine,
  ],
  optCommon
);

/**
 * Apply at interval
 */
onceInterval([updateIndexesRoutine], optHourly);
onceInterval([updateGeoIpTableRoutine], optWeekly);
onceInterval([updateGeoserverRoutine], optDaily);
