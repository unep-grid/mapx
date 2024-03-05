import { getViewRemote, viewsReplace } from "./../map_helpers/index.js";
import { viewsListAddSingle } from "./../views_list_manager";
import { isNotEmpty, isArrayOfViews, isFunction } from "../is_test/index.js";
import { getViewMapboxStyle, getViewSldStyle } from "./../style_vt/index.js";
import { isProd } from "./../app_utils";
import { nc } from "./../mx.js";
import { clone } from "./../mx_helper_misc.js";
import { sjm_instances } from "../source/joins/index.js";
/**
 * Create list of handlers
 *
 */
export const eventsHandlers = {
  "/server/authentication": handlerAuthentication,
  "/server/error": handlerError,
  "/server/notify": handlerNotify,
  "/server/view/add": handlerViewAdd,
  "/server/source/added": handlerSourceAdded,
  "/server/view/style/get": handlerViewStyleGet,
  "/server/test/echo": handlerEcho,
  "/server/test/sum": handlerSum,
  "/server/spread/views/update": handleViewsReplace,
  "/server/spread/join_editor/update": handleJoinEditorUpdate,
};

async function handlerSourceAdded(data, cb) {
  triggerUpdateSourcesList();
  cb(data);
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
    const view = clone(message.view);
    await viewsListAddSingle(view);
  } catch (e) {
    console.error(e);
    message.error = `Error processing view add: ${e.message}`;
  }
  cb(message);
}

/**
 * Replace views from server
 * @param {Object} message
 * @param {Object} message.view  View to replace
 * @param {Function} cb Callback for the server
 * @return {void}
 */
async function handleViewsReplace(message, cb) {
  const { views } = message;
  const valid = isArrayOfViews(views);
  if (!valid) {
    console.error("Views replace should provide valid views ");
    if (isFunction(cb)) {
      cb({ ok: false });
    }
  }
  const ok = await viewsReplace(views);
  if (isFunction(cb)) {
    message.ok = ok;
    cb(message);
  }
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
    const { default: sld } = await import("../../sld/empty.sld");
    const result = {
      sld: sld,
      mapbox: {},
    };
    if (hasRules) {
      /*
       * TODO: check why this comment was there :
       * - should match jedHooksApply in jed helper
       */
      Object.assign(result, {
        sld: await getViewSldStyle(view),
        mapbox: await getViewMapboxStyle(view),
      });
    }

    message.result = result;
  } catch (e) {
    console.error(e);
    message.error = `Error processing style for view ${e.message}`;
  }
  cb(message);
}

/**
 * Server sent updates. If an editor exists with the given source :
 * - handle updates
 * message -> source_columns_rename -> [
 *   {
 *     id_source: 'mx_xkbpr_vfd4q_vyvy9_t19nl_xo2l3',
 *     old_column: 'x1_new_4',
 *     new_column: 'x1_new_5'
 *   }
 *
 * ]
 *
 */
async function handleJoinEditorUpdate(message, cb) {
  const updates = message?.source_columns_rename;
  for (const sjm of sjm_instances) {
    await sjm.autoReload(updates, true);
  }
  if (isFunction(cb)) {
    message.ok = ok;
    cb(message);
  }
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
    10e3,
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
    10e3,
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
