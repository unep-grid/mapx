import { pgRead } from "#mapx/db";
import { templates } from "#mapx/template";
import { isSourceId } from "@fxi/mx_valid";
import { getColumnsTypesSimple } from "#mapx/db_utils";

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

    const value = await handleMethod(method, config);

    cb(value);
  } catch (e) {
    console.error(e);
    await socket.notifyInfoError({
      message: e.message,
    });
  }
}

async function handleMethod(method, config) {
  switch (method) {
    case "get":
      return getJoinConfig(config);
    case "set":
      return setJoinConfig(config);
    case "attributes":
      return getAtributes(config);
    default:
      throw new Error(msg("unsupported method"));
  }
}

async function setJoinConfig(config) {
  console.log("create or update.. to be completed", config);
}

async function getJoinConfig(config) {
  const { idSource } = config;
  if (!isSourceId(idSource)) {
    throw new Error(msg("Missing Source ID"));
  }
  const res = await pgRead(templates.getSourceJoinConfig, [idSource]);
  return res.rows[0] || {};
}

async function getAtributes(config) {
  const { idSource, idAttr, idAttrExclude } = config;
  if (!isSourceId(idSource)) {
    throw new Error(msg("Missing Source ID"));
  }
  return getColumnsTypesSimple(idSource, idAttr, idAttrExclude);
}

function msg(txt) {
  return `Join:${txt}`;
}
