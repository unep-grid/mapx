import { pgWrite } from "#mapx/db";
import {
  areLayersValid,
  getColumnsNames,
  registerSource,
} from "#mapx/db_utils";
import { randomString } from "#mapx/helpers";
import { sendMailAuto } from "#mapx/mail";
import { getSourcesList } from "../list/index.js";
import { getGeometryColumnInfo } from "../attribute_table/geometry.js";
import { getSourceIdentityStatus } from "../attribute_table/identity.js";
import { isSourceId, isString } from "@fxi/mx_valid";
import {
  buildAreaOverlapSql,
  buildCreateOverlapSql,
  buildFinalizeOverlapSql,
  buildOverlapGeometryProfileSql,
  deriveOverlapGeometryType,
} from "./sql.js";

const modes = new Set(["area", "create_source"]);
const maxLayers = 3;

export async function ioSourceOverlap(socket, request, callback) {
  const idRequest =
    isString(request?.id_request) && request.id_request.length <= 100
      ? request.id_request
      : randomString("mx_overlap");
  try {
    const options = await validateOverlapRequest(socket, {
      ...request,
      id_request: idRequest,
    });
    callback({ accepted: true, id_request: idRequest });
    await runOverlap(socket, options);
  } catch (error) {
    const result = {
      id_request: idRequest,
      success: false,
      error: error?.message || error,
    };
    callback({ accepted: false, ...result });
    await emitResult(socket, result);
  }
}

async function validateOverlapRequest(socket, request) {
  const session = socket?.session || {};
  if (!session.user_authenticated || !session.user_roles?.publisher) {
    throw new Error("Overlap tool is not allowed");
  }

  const mode = request?.mode;
  const layers = Array.isArray(request?.layers)
    ? [...new Set(request.layers)]
    : [];
  const country = `${request?.country || ""}`.toUpperCase();
  const language = /^[a-z]{2}$/i.test(request?.language || "")
    ? request.language.toLowerCase()
    : "en";
  if (!modes.has(mode)) {
    throw new Error("Invalid overlap mode");
  }
  if (
    layers.length < 1 ||
    layers.length > maxLayers ||
    !layers.every(isSourceId)
  ) {
    throw new Error("Select between one and three vector sources");
  }
  if (!/^[A-Z]{3}$/.test(country)) {
    throw new Error("Select one country");
  }
  const title = `${request?.title || ""}`.trim();
  if (mode === "create_source" && (title.length < 5 || title.length > 200)) {
    throw new Error("Source title must contain between 5 and 200 characters");
  }

  const available = await getSourcesList({
    idProject: session.project_id,
    idUser: session.user_id,
    groups: session.user_roles.group || [],
    types: ["vector"],
    language,
    readable: true,
    editable: false,
    add_global: true,
    add_views: true,
    include_dimensions: false,
  });
  const readable = new Set(available.map((source) => source.id));
  if (!layers.every((id) => readable.has(id))) {
    throw new Error("One or more overlap sources are not readable");
  }

  const mainIdentity = await getSourceIdentityStatus(layers[0]);
  if (!mainIdentity.valid) {
    throw new Error(
      `Base source gid identity is invalid: ${mainIdentity.issues.join(", ")}`,
    );
  }

  return {
    id_request: request.id_request,
    mode,
    layers,
    country,
    title,
    language,
    idUser: Number(session.user_id),
    idProject: session.project_id,
    email: session.user_email,
  };
}

async function runOverlap(socket, options) {
  const start = Date.now();
  try {
    await notify(socket, options, "Validating source geometries");
    const validation = await areLayersValid(options.layers, true, false);
    const invalid = validation.find((item) => !item.valid);
    if (invalid) {
      throw new Error(
        `Source ${invalid.title} (${invalid.id}) contains invalid geometries`,
      );
    }

    const result =
      options.mode === "area"
        ? await calculateOverlapArea(socket, options)
        : await createOverlapSource(options);
    result.id_request = options.id_request;
    result.mode = options.mode;
    result.success = true;
    result.duration_ms = Date.now() - start;
    await emitResult(socket, result);

    if (result.source) {
      try {
        await socket.mx_emit_ws_response?.("/server/source/added", {
          idSource: result.source.id,
        });
      } catch (error) {
        console.warn("Unable to notify source creation", error);
      }
      await sendCompletionEmail(options, result.source).catch((error) => {
        console.warn("Unable to send overlap completion email", error);
      });
    }
  } catch (error) {
    const result = {
      id_request: options.id_request,
      mode: options.mode,
      success: false,
      duration_ms: Date.now() - start,
      error: error?.message || error,
    };
    await socket.notifyInfoError?.({
      idGroup: options.id_request,
      message: result.error,
    });
    await emitResult(socket, result);
    if (options.mode === "create_source") {
      await sendFailureEmail(options, result.error).catch((emailError) => {
        console.warn("Unable to send overlap failure email", emailError);
      });
    }
  }
}

async function calculateOverlapArea(socket, options) {
  await notify(socket, options, "Calculating overlap area");
  const result = await pgWrite.query({
    text: buildAreaOverlapSql(options),
    values: [options.country],
  });
  return {
    area_m2: Number(result.rows[0]?.area_m2) || 0,
  };
}

async function createOverlapSource(options) {
  const idSource = randomString("mx_vector", 4, 5).toLowerCase();
  const client = await pgWrite.connect();
  try {
    const attributes = (await getColumnsNames(options.layers[0])).filter(
      (name) => !["gid", "geom", "_mx_valid"].includes(name),
    );
    const geometryInfo = await getGeometryColumnInfo(options.layers[0]);

    await client.query("BEGIN");
    await client.query({
      text: buildCreateOverlapSql({
        idSource,
        layers: options.layers,
        attributes,
      }),
      values: [options.country],
    });
    const count = await client.query(
      `SELECT count(*)::integer AS count FROM "${idSource}"`,
    );
    if ((Number(count.rows[0]?.count) || 0) === 0) {
      throw new Error("No intersection found");
    }
    const profile = await client.query(
      buildOverlapGeometryProfileSql({ idSource }),
    );
    const geometryType = deriveOverlapGeometryType(profile.rows[0]?.dimensions);
    const finalize = buildFinalizeOverlapSql({
      idSource,
      geometryType,
      srid: geometryInfo.srid,
    });
    for (const text of finalize) {
      await client.query({
        text,
        values: text.includes("pg_get_serial_sequence")
          ? [idSource]
          : undefined,
      });
    }
    await registerSource(
      {
        idSource,
        idUser: options.idUser,
        idProject: options.idProject,
        title: options.title,
        type: "vector",
        language: options.language,
      },
      client,
    );
    await client.query(`ANALYZE "${idSource}"`);
    await client.query("COMMIT");
    return {
      source: {
        id: idSource,
        title: options.title,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function notify(socket, options, message) {
  await socket?.notifyInfoMessage?.({
    idGroup: options.id_request,
    message,
  });
  await socket?.mx_emit_ws?.("/server/source/overlap/progress", {
    id_request: options.id_request,
    message,
  });
}

async function emitResult(socket, result) {
  await socket?.mx_emit_ws?.("/server/source/overlap/result", result);
}

async function sendCompletionEmail(options, source) {
  if (!options.email) {
    return;
  }
  await sendMailAuto({
    to: [options.email],
    content: `Source '${source.title}' created (id: ${source.id}).`,
    subject: `MapX - overlap source '${source.title}' created`,
  });
}

async function sendFailureEmail(options, error) {
  if (!options.email) {
    return;
  }
  await sendMailAuto({
    to: [options.email],
    content: `Source '${options.title}' was not created. Error: ${error}`,
    subject: `MapX - overlap source '${options.title}' failed`,
  });
}

export const overlapInternals = {
  calculateOverlapArea,
  createOverlapSource,
  validateOverlapRequest,
};
