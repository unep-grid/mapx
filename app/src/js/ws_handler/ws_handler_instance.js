import { WsHandler } from "./../ws_handler";
import { getViewMapboxStyle, mapboxToSld } from "./../style_vt/index.js";
import { getLoginInfo, getViewRemote } from "./../map_helpers/index.js";
import { isNotEmpty } from "../is_test/index.js";
import { getApiUrl, getApiRoute } from "./../api_routes";
import { bindAll } from "../bind_class_methods";
import { isProd } from "./../app_utils";
export { WsHandlerMapx };

/**
 * Create a configured instance of WsHandler
 * Defines :
 * - emit type handlers
 * - tests
 * - job request handlers
 */
class WsHandlerMapx extends WsHandler {
  constructor() {
    super({
      url: getApiUrl,
      auth: getLoginInfo, // evaluated for each connect
      handlers: getHandlers(),
      tests: getTests(),
    });
    bindAll(this);
  }
}

/**
 * Create list of handlers
 */
function getHandlers() {
  return {
    /* error handler */
    error: console.warn,
    /* simple echo */
    echo: console.log,
    /* server state messages */
    authentication: handleAuthentication,
    /* message formated for Notify */
    notify: async function (message) {
      await mx.nc.notify(message); //wrapper to avoid double bind
    },
    /* job from server  */
    job_request: async function (job) {
      const ws = this;
      const result = {
        id: job.id,
        output: {},
        error: null,
      };
      switch (job.id_resolver) {
        case "job_echo":
          job_test_echo(job, result);
          break;

        case "job_sum":
          job_test_sum(job, result);
          break;
        case "style_from_view":
          await job_style_convert(job, result);
          break;
        default:
          result.error = `No job_request handler for ${job.id_resolver}`;
      }
      ws.emit("job_result", result);
      return true;
    },
  };
}

/**
 * Create tests resolver
 */
function getTests() {
  return async function (id, ws) {
    switch (id) {
      case "job_echo": {
        const value = { now: Date.now() };
        const routeEcho = getApiRoute("testJobEcho");
        const response = await ws.emitGet(routeEcho, {
          now: value.now,
        });
        const pass = value.now === response?.output?.now;
        return pass;
      }
      case "job_sum": {
        const arrayNum = [1, 2, 3, 4, 5];
        const expected = arrayNum.reduce((a, c) => a + c, 0);
        const routeSum = getApiRoute("testJobSum");
        const response = await ws.emitGet(routeSum, {
          arrayNum,
        });

        const pass = response?.output?.sum === expected;
        return pass;
      }
      default:
        console.log(`test '${id}' not defined`);
    }
  };
}

/*
 * Authentication result 
 * -> For now, used for dev only.
 * -> Will be usefull for set roles in settings
 */
function handleAuthentication(auth) {
  if (isProd()) {
    return;
  }
  console.info("Authentication ws:", auth);
}

/**
 * Job handlers
 *
 * job.input -> <do something> -> result.output
 *
 */

/*
 *  Handle simple server job :
 * - get the data
 * - do simple operation
 * - send back the result
 */
function job_test_echo(job, result) {
  result.output = job.input;
  return result;
}
function job_test_sum(job, result) {
  /* data is an array of number, we want the sum */
  const arrayNum = job?.input?.arrayNum || [];
  result.output.sum = arrayNum.reduce((a, c) => a + c, 0);
  return result;
}

/*
 * Style conversion from server:
 * - match exactly client side code
 * - could be ported server side when mapx -> mapbox + geostyler
 *   will be operational
 */
async function job_style_convert(job, result) {
  try {
    const view = await getViewRemote(job.input.idView);
    const rules = view?.data?.style?.rules || [];
    const hasRules = isNotEmpty(rules);
    if (hasRules) {
      const mapboxStyle = await getViewMapboxStyle(view, {
        useLabelAsId: true,
        addMetadata: true,
        simplifyExpression: true,
      });
      result.output.mapbox = mapboxStyle;
      result.output.sld = await mapboxToSld(mapboxStyle);
    }
  } catch (e) {
    result.error = `Error processing style for view ${job.input.idView}, ${e.message}`;
  }
  return result;
}
