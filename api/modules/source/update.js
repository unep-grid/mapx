import express from "express";
import { isArray, isObject, isSourceId } from "@fxi/mx_valid";
import { pgWrite } from "#mapx/db";
import { validateTokenHandler } from "#mapx/authentication";
import { removeSource } from "#mapx/db_utils";
import { createSourceRevision } from "./revision.js";
import { getSourceEditPermission } from "./permissions.js";
import {
  getSourceSettingsContext,
  sourceSettingsAllowedValues,
  SourceSettingsError,
} from "./settings/index.js";

class SourceRevisionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

async function assertUserCanEditSource(client, idSource, idUser) {
  const permission = await getSourceEditPermission({
    client,
    idSource,
    idUser,
  });
  const { source, roles, allowed } = permission;
  if (!source) {
    throw new SourceRevisionError(`Source not registered: ${idSource}`, 404);
  }

  if (!allowed) {
    throw new SourceRevisionError("Source edit not allowed", 403);
  }

  return roles;
}

function validateRequest(method, idSource, changes, idUser) {
  if (!isSourceId(idSource)) {
    throw new SourceRevisionError("Invalid source id");
  }
  if (!Number.isInteger(Number(idUser))) {
    throw new SourceRevisionError("Invalid source revision actor");
  }
  if (!new Set(["metadata", "settings", "delete"]).has(method)) {
    throw new SourceRevisionError(
      `Unsupported source revision method: ${method}`,
    );
  }
  if (method !== "delete" && !isObject(changes)) {
    throw new SourceRevisionError("Invalid source revision changes");
  }
}

function reviseMetadata(idSource, idUser, changes, client) {
  if (!isObject(changes.metadata)) {
    throw new SourceRevisionError("Invalid source metadata");
  }
  return createSourceRevision({
    idSource,
    idUser,
    client,
    mutate(revision) {
      revision.data ||= {};
      revision.data.meta = structuredClone(changes.metadata);
    },
  });
}

function validateAllowedValues(key, values, allowed) {
  if (values.some((value) => !allowed.includes(value))) {
    throw new SourceRevisionError(`Invalid source ${key}`);
  }
}

function reviseSettings(idSource, idUser, changes, roles, source, client) {
  for (const key of ["services", "readers", "editors"]) {
    if (!isArray(changes[key])) {
      throw new SourceRevisionError(`Invalid source ${key}`);
    }
  }
  validateAllowedValues(
    "readers",
    changes.readers,
    sourceSettingsAllowedValues.readers,
  );
  validateAllowedValues(
    "editors",
    changes.editors,
    sourceSettingsAllowedValues.editors,
  );
  validateAllowedValues(
    "services",
    changes.services,
    sourceSettingsAllowedValues.servicesByType[source.type] || [],
  );
  if (Object.hasOwn(changes, "global") && roles.root !== true) {
    throw new SourceRevisionError(
      "Only root users may change global sources",
      403,
    );
  }
  return createSourceRevision({
    idSource,
    idUser,
    client,
    mutate(revision) {
      revision.services = structuredClone(changes.services);
      revision.readers = structuredClone(changes.readers);
      revision.editors = structuredClone(changes.editors);
      if (roles.root === true && Object.hasOwn(changes, "global")) {
        revision.global = changes.global === true;
      }
    },
  });
}

/**
 * Apply an authenticated source operation independently of its transport.
 * Identity is the only caller-provided authorization input; source project and
 * roles are resolved on the server while holding the source transaction lock.
 */
export async function reviseSource({
  method,
  idSource,
  changes = {},
  idUser,
  idProject = null,
}) {
  validateRequest(method, idSource, changes, idUser);

  const client = await pgWrite.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
      [idSource],
    );
    const roles = await assertUserCanEditSource(client, idSource, idUser);

    let result;
    if (method === "delete") {
      if (idProject) {
        const context = await getSourceSettingsContext({
          client,
          idSource,
          idUser,
          idProject,
        });
        if (context.usage.hasDependencies) {
          throw new SourceSettingsError(
            `Source ${idSource} can't be removed [has dependencies]`,
            409,
            { usage: context.usage },
          );
        }
      }
      try {
        await removeSource(idSource, idUser, client);
      } catch (error) {
        if (error.message?.includes("has dependencies")) {
          throw new SourceRevisionError(error.message, 409);
        }
        throw error;
      }
      result = { ok: true, idSource, deleted: true };
    } else {
      let revision;
      if (method === "metadata") {
        revision = await reviseMetadata(idSource, idUser, changes, client);
      } else {
        const context = await getSourceSettingsContext({
          client,
          idSource,
          idUser,
          idProject: idProject || undefined,
        });
        const proposedGlobal =
          roles.root === true && Object.hasOwn(changes, "global")
            ? changes.global === true
            : context.source.global === true;
        if (!proposedGlobal && context.usage.hasOtherProject) {
          throw new SourceSettingsError(
            "A source used by another project must remain global",
            409,
            { usage: context.usage },
          );
        }
        if (
          !proposedGlobal &&
          !changes.readers.includes("publishers") &&
          context.usage.hasOtherEditor
        ) {
          throw new SourceSettingsError(
            "Publisher access is required by dependent content",
            409,
            { usage: context.usage },
          );
        }
        revision = await reviseSettings(
          idSource,
          idUser,
          changes,
          roles,
          context.source,
          client,
        );
      }
      result = { ok: true, idSource, pid: revision.pid };
    }

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Socket.IO transport retained for the future client-only source manager. */
export async function ioSourceRevise(socket, request, callback) {
  try {
    const session = socket.session || {};
    if (!session.user_authenticated) {
      throw new SourceRevisionError("Unauthorized", 403);
    }
    callback(
      await reviseSource({
        ...request,
        idUser: session.user_id,
        idProject: session.project_id,
      }),
    );
  } catch (error) {
    console.error("Source revision failed", error);
    await socket.notifyInfoError({ message: error.message });
    callback({
      ok: false,
      error: error.message,
      status: error.status || 500,
      details: error.details || null,
    });
  }
}

async function postSourceRevise(req, res) {
  try {
    const { method, idSource, changes = {}, idUser } = req.body || {};
    res.json(await reviseSource({ method, idSource, changes, idUser }));
  } catch (error) {
    console.error("Source revision failed", error);
    res.status(error.status || 500).json({
      type: "error",
      message: error.message || "Source revision failed",
    });
  }
}

export const mwSourceRevise = [
  express.json({ limit: "2mb" }),
  validateTokenHandler,
  postSourceRevise,
];
