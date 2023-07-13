import { modalChangelog } from "./changelog/index.js";
import { getDictItem } from "./language";
import { modalDialog } from "./mx_helper_modal.js";
import { el } from "./el/src";
import {
  clearSwCache,
  clearForageCache,
  clearServiceWorker,
} from "./cache_management/index.js";

/**
 * Register and handle service worker events
 * Adapted from https://developers.google.com/web/tools/workbox/guides/advanced-recipes
 * SEE also sw_listen_skip_waiting_install.js in ./webpack folder
 */
const minQuota = 1e8; // 100 MB or ~95 MiB
const maxUsage = 5e8; // 500 MB or ~477 MiB

const isCompatible =
  "serviceWorker" in navigator &&
  "storage" in navigator &&
  "estimate" in navigator.storage &&
  "caches" in window;

let blockReload = false;

console.log("INIT SW");

if (isCompatible) {
  cleanIfNeeded();
} else {
  console.log("SW not supported");
}

/**
 * Remove cache and sw is required
 */

async function cleanIfNeeded() {
  const test = await hasEnoughStorage();
  if (test === true) {
    console.log(`SW - Storage seems ok, register service worker.`);
    addListener();
  } else {
    console.log(
      `SW - There is not enough storage, MapX will try to remove cache.`
    );
    const hadSW = await clearServiceWorker();
    const hadCache = await clearSwCache();
    const hadForage = await clearForageCache();
    const testAfter = await hasEnoughStorage();
    if (hadSW || hadCache || hadForage) {
      console.log(`SW - Cache removed`);
    }
    if (testAfter === true) {
      return addListener();
    }

    console.log(
      `SW - Lack of storage space, MapX will not try to register service worker restart.`
    );
  }
}

function addListener() {
  if (document.readyState === "complete") {
    handleInitSw();
  } else {
    window.addEventListener("load", handleInitSw);
  }
}

function toMib(b) {
  return (b / Math.pow(Math.pow(2, 10), 2)).toFixed(2) + " Mib";
}

async function hasEnoughStorage() {
  const estimate = await navigator.storage.estimate();
  const percent = (estimate.usage / estimate.quota) * 100;
  const percentString = percent.toFixed(2) + "%";
  console.log(`SW - User quota: ${toMib(estimate.quota)}`);
  console.log(`SW - User percent: ${percentString}`);
  console.log(`SW - MapX usage: ${toMib(estimate.usage)}`);
  console.log(`SW - MapX min quota: ${toMib(minQuota)}`);
  console.log(`SW - MapX max usage: ${toMib(maxUsage)}`);
  return estimate.quota > minQuota && estimate.usage < maxUsage;
}

async function handleInitSw() {
  console.log("SW - register !");
  const registration = await navigator.serviceWorker.register(
    "/assets/service-worker.js"
  );
  await handleRegistration(registration);
}

function handleRegistration(registration) {
  return new Promise((resolve) => {
    /**
     *  if no controller, new service worker will
     *  activate immediatly
     */
    if (!navigator.serviceWorker.controller) {
      resolve(false);
      return;
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    handleNewServiceWorker(registration, async () => {
      await showRefreshUI(registration);
      return resolve(true);
    });
  });
}

function handleControllerChange() {
  if (blockReload) {
    return;
  }
  blockReload = true;
  restart();
}

function restart() {
  window.location.reload();
}

function handleNewServiceWorker(registration, informUser) {
  if (registration.waiting) {
    /**
     * SW is waiting to activate. Can occur if multiple clients open and
     * one of the clients is refreshed.
     */
    return informUser();
  }

  if (registration.installing) {
    return listenInstalledStateChange();
  } else {
    // We are currently controlled so a new SW may be found...
    // Add a listener in case a new SW is found,
    registration.addEventListener("updatefound", listenInstalledStateChange);
  }

  function listenInstalledStateChange() {
    registration.installing.addEventListener("statechange", (event) => {
      if (event.target.state === "installed") {
        // A new service worker is available, inform the user
        informUser();
      }
    });
  }
}

/**
 * Display a modal window to inform the user that the app has been updated :
 * -> restart will restart all mapx instance on that browser
 */
async function showRefreshUI(registration) {
  const isEmbeded = window.parent !== window;
  const hasMapx = window.mx && getDictItem;
  const skipWaiting = !hasMapx || isEmbeded;

  if (skipWaiting) {
    return update();
  }
  const t = getDictItem;

  const elBtnChanges = el(
    "button",
    {
      class: ["btn", "btn-default"],
      on: ["click", () => modalChangelog(true)],
    },
    t("update_app_button_read_changlog")
  );
  const elMessage = el("p", t("update_app_msg"));

  const res = await modalDialog({
    title: t("update_app_modal_title"),
    content: el("div", [elMessage, elBtnChanges]),
    close: t("update_app_button_confirm"),
  });

  if (res === true) {
    update();
  }

  function update() {
    if (!registration.waiting) {
      return;
    }
    registration.waiting.postMessage("mx_install");
  }
}
