import { pgRead } from "#mapx/db";
import { templates } from "#mapx/template";
import { isSourceId } from "@fxi/mx_valid";
import { getColumnsTypesSimple } from "#mapx/db_utils";
import { newIdSource } from "#mapx/upload";
import { registerSource } from "#mapx/db_utils";
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

    const value = await handleMethod(method, config, session);

    cb(value);
  } catch (e) {
    console.error(e);
    await socket.notifyInfoError({
      message: e.message,
    });
  }
}

async function handleMethod(method, config, session) {
  switch (method) {
    case "get":
      return getJoinConfig(config);
    case "set":
      return setJoinConfig(config);
    case "attributes":
      return getAtributes(config);
    case "create":
      return create(config, session);
    default:
      throw new Error(msg("unsupported method"));
  }
}

async function create(config, session) {
  const idSource = newIdSource();
  const title = config.title || `New Join ${new Date().toLocaleString()}`;
  const idUser = session.user_id;
  const idProject = session.project_id;
  const type = "join";
  const allowDownload = false;
  const enableWms = false;
  const ok = await registerSource(
    idSource,
    idUser,
    idProject,
    title,
    type,
    allowDownload,
    enableWms
  );
  if (!ok) {
    throw new Error(msg("Creation failed"));
  }
  return { idSource };
}

async function setJoinConfig(config) {
  console.log("create or update.. to be completed", config);
}

async function getJoinConfig(config) {
  const { idSource } = config;
  if (!isSourceId(idSource)) {
    throw new Error(msg("Missing Source ID"));
  }
  const res = await pgRead.query(templates.getSourceJoinConfig, [idSource]);
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
