import {
  getViewRemote,
  triggerUpdateSourcesList,
} from "./../map_helpers/index.js";
import { viewsListAddSingle } from "./../mx_helper_map_view_ui.js";
import { isNotEmpty } from "../is_test/index.js";
import { getViewMapboxStyle, getViewSldStyle } from "./../style_vt/index.js";
import { isProd } from "./../app_utils";
import { nc } from "./../mx.js";

/**
 * Create list of handlers
 *
 */
export const routes = {
  "/server/authentication": handlerAuthentication,
  "/server/error": handlerError,
  "/server/notify": handlerNotify,
  "/server/view/add": handlerViewAdd,
  "/server/source/added": handlerSourceAdded,
  "/server/view/style/get": handlerViewStyleGet,
  "/server/test/echo": handlerEcho,
  "/server/test/sum": handlerSum,
};

async function handlerSourceAdded() {
  triggerUpdateSourcesList();
}

async function handlerError(message) {
  console.warn(message);
}

async function handlerNotify(message) {
  return await nc.notify(message);
}

/*
 * Authentication result
 * -> For now, used for dev only.
 * -> Will be usefull for set roles in settings
 * @param  {Object} auth  Authentication object
 * @param  {Boolean} auth.authenticated Authenticated
 * @param  {Object} auth.roles Roles
 */
function handlerAuthentication(auth, cb) {
  console.log(auth, isProd());
  cb(true);
}

/**
 * Inject view from server
 */
async function handlerViewAdd(message, cb) {
  try {
    await viewsListAddSingle(message.view);
  } catch (e) {
    console.error(e);
    message.error = `Error processing view add: ${e.message}`;
  }
  cb(message);
}

/*
 * Style conversion from server:
 * - match exactly client side code
 * - could be ported server side when mapx -> mapbox + geostyler
 *   will be operational
 */
async function handlerViewStyleGet(message, cb) {
  try {
    const view = await getViewRemote(message.idView);
    const style = view?.data?.style || {};
    const rules = style?.rules || [];
    const hasRules = isNotEmpty(rules);

    if (hasRules) {
      /*
       * TODO: check why this comment was there :
       * - should match jedHooksApply in jed helper
       */
      message.result = {
        sld: await getViewSldStyle(view),
        mapbox: await getViewMapboxStyle(view),
      };
    }
  } catch (e) {
    console.error(e);
    message.error = `Error processing style for view ${e.message}`;
  }
  cb(message);
}

/**
 * Tests
 */
export const tests = {
  "/client/test/echo": testEcho,
  "/client/test/sum": testSum,
};

async function testSum(id, ws) {
  const response = await ws.emitAsync(
    id,
    {
      arrayNum: [1, 2, 3, 4],
    },
    10e3
  );
  return response.result === 10;
}

async function testEcho(id, ws) {
  const now = Date.now();
  const response = await ws.emitAsync(
    id,
    {
      start: now,
      end: null,
    },
    10e3
  );
  const valid = response.start === now;
  const duration = response.end - now;
  return valid && duration < 1e3;
}

function handlerEcho(message, cb) {
  message.end = Date.now();
  cb(message);
}

function handlerSum(message, cb) {
  const arrayNum = message?.arrayNum || [];
  message.result = arrayNum.reduce((a, c) => a + c, 0);
  cb(message);
}
