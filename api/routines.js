import * as migrate from "#mapx/migrate";
import * as language from "#mapx/language";
import { updateIndexes } from "#mapx/search";
import { updateGeoIpTable } from "#mapx/ip";
import { updateGeoserver } from "#mapx/geoserver";
import { clearDownload } from "#mapx/helpers";
import { once, onceInterval } from "#mapx/helpers";
import { sendMailAuto } from "#mapx/mail";
import { settings } from "#root/settings";

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
const clearDownloadRoutine = () => clearDownload();
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
    const str = cbs.map((cb) => cb.name).join(", ");
    console.error(`Update for ${str} had issue`, e);
    sendMailAuto({
      from: settings.contact.email_bot,
      to: settings.contact.email_admin,
      subject: `Routine failure: ${str}`,
      content: `<p>Routine <strong>${str}</strong> failed.</p><pre>${e?.stack || e?.message || e}</pre>`,
    }).catch((mailErr) => {
      console.error("Failed to send routine error notification", mailErr);
    });
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
    clearDownloadRoutine,
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
onceInterval([updateGeoserverRoutine, clearDownloadRoutine], optDaily);
