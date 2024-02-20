import { withTransaction } from "#mapx/db_utils";
import { getSchema } from "./schema.js";
import { config_default, join_default } from "./defaults.js";
import { validator } from "./validator.js";
import {
  getJoinConfig,
  getJoinData,
  msg,
  getCount,
  getColumnsType,
  getPreview,
  getColumnsMissingInJoin,
  setJoinConfig,
  register,
  unregister,
} from "./helpers.js";

export * from "./helpers.js";

export async function ioSourceJoin(socket, data, cb) {
  const session = socket.session;

  try {
    if (!session) {
      throw new Error(msg("No Session"));
    }

    if (!session.user_authenticated || !session.user_roles.publisher) {
      throw new Error(msg("Unauthorized"));
    }

    const { method, config } = data;

    const response = await handleMethod(method, config, session, socket);

    cb(response);
  } catch (e) {
    console.error(e);
    await socket.notifyInfoError({
      message: e.message,
    });
  }
}

/**
 * Handles different methods for join configuration.
 *
 * @param {string} method - The method to execute.
 * @param {Object} config - Configuration.
 * @param {Object} session - Session information.
 * @param {Object} socket - Websocket.
 * @returns {Promise<any>} - Result of the executed method.
 */
async function handleMethod(method, config, session, socket) {
  const handlers = {
    get_config_default: () => config_default,
    get_join_default: () => join_default,
    get_config: () => getJoinConfig(config),
    get_data: () => getJoinData(config),
    get_schema: () => getSchema(config?.language),
    get_count: () => getCount(config),
    get_preview: () => getPreview(config),
    validate: () => validator.validate(config),
    get_columns_missing: () => getColumnsMissingInJoin(config),
    get_columns_type: () => getColumnsType(config),
    set_config: (client) => setJoinConfig(config, client, socket),
    register: (client) => register(config, session, client),
    unregister: (client) => unregister(config, session, client),
  };

  if (!handlers[method]) {
    throw new Error(`Unsupported method ${method}`);
  }

  const useTransaction = ["set_config", "register"].includes(method);

  if (useTransaction) {
    return withTransaction((client) => handlers[method](client));
  } else {
    return handlers[method]();
  }
}
