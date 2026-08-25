import express from "express";
import { pgWrite } from "#mapx/db";
import { getUserRoles, validateTokenHandler } from "#mapx/authentication";
import {
  isProjectId,
  isSourceId,
  isString,
  isViewId,
} from "@fxi/mx_valid";
import { createExternalMetadataSource } from "../source/external.js";
import { insertNewView } from "./create.js";

class ViewLifecycleError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function validateOwner({ idUser, idProject, idView = null }) {
  if (!Number.isInteger(Number(idUser)) || !isProjectId(idProject)) {
    throw new ViewLifecycleError("Invalid view owner or identifier");
  }
  if (idView !== null && !isViewId(idView)) {
    throw new ViewLifecycleError("Invalid view owner or identifier");
  }
}

/** Create an RT/CC view and its dedicated external metadata atomically. */
export async function createExternalMetadataView(
  { idUser, idProject, viewType, title, language = "en" },
  client = null,
) {
  validateOwner({ idUser, idProject });
  if (!["rt", "cc"].includes(viewType)) {
    throw new ViewLifecycleError("Invalid external metadata view type");
  }
  const normalizedTitle = isString(title) ? title.trim() : "";
  if (!normalizedTitle || !/^[a-z]{2,3}$/i.test(language)) {
    throw new ViewLifecycleError("Invalid view title or language");
  }

  const ownsClient = !client;
  const pgClient = client || (await pgWrite.connect());
  try {
    if (ownsClient) await pgClient.query("BEGIN");
    const roles = await getUserRoles(idUser, idProject, pgClient);
    if (roles.publisher !== true) {
      throw new ViewLifecycleError("View creation denied", 403);
    }
    if (viewType === "cc" && roles.developer !== true) {
      throw new ViewLifecycleError("Custom-code view creation denied", 403);
    }

    const titleByLanguage = { [language]: normalizedTitle };
    const metadata = {
      text: { title: titleByLanguage, abstract: {} },
    };
    const created = await createExternalMetadataSource(
      { idUser, idProject, metadata },
      pgClient,
    );
    const idSource = created?.source?.id;
    if (!isSourceId(idSource)) {
      throw new ViewLifecycleError(
        "External metadata creation returned no source identifier",
        500,
      );
    }

    const source = { metadataId: idSource };
    if (viewType === "rt") source.tiles = [];
    const data = { title: titleByLanguage, abstract: {}, source };
    const view = await insertNewView(
      { editor: idUser, data, type: viewType, project: idProject },
      pgClient,
    );
    if (ownsClient) await pgClient.query("COMMIT");
    return { ok: true, view, idSource };
  } catch (error) {
    if (ownsClient) await pgClient.query("ROLLBACK");
    throw error;
  } finally {
    if (ownsClient) pgClient.release();
  }
}

/** Delete a view and its unshared, same-project external metadata atomically. */
export async function deleteViewWithExternalMetadata(
  { idUser, idProject, idView },
  client = null,
) {
  validateOwner({ idUser, idProject, idView });
  const ownsClient = !client;
  const pgClient = client || (await pgWrite.connect());
  try {
    if (ownsClient) await pgClient.query("BEGIN");
    const roles = await getUserRoles(idUser, idProject, pgClient);
    const viewResult = await pgClient.query(
      `SELECT editor, editors, project, type, data
       FROM mx_views
       WHERE id = $1
       ORDER BY pid DESC
       LIMIT 1
       FOR UPDATE`,
      [idView],
    );
    const view = viewResult.rows[0];
    if (!view || view.project !== idProject) {
      throw new ViewLifecycleError("View not found", 404);
    }

    const editors = asArray(view.editors);
    const canEdit =
      editors.includes(String(idUser)) ||
      (roles.publisher === true &&
        (view.editor === Number(idUser) ||
          editors.includes("publishers") ||
          (roles.admin === true && editors.includes("admins"))));
    if (!canEdit) {
      throw new ViewLifecycleError("View deletion denied", 403);
    }

    const idSource = ["rt", "cc"].includes(view.type)
      ? view.data?.source?.metadataId
      : null;
    let source = null;
    if (isSourceId(idSource)) {
      const sourceResult = await pgClient.query(
        `SELECT project, type
         FROM mx_sources
         WHERE id = $1
         ORDER BY pid DESC
         LIMIT 1
         FOR UPDATE`,
        [idSource],
      );
      source = sourceResult.rows[0] || null;
    }

    const deletedView = await pgClient.query(
      "DELETE FROM mx_views WHERE id = $1",
      [idView],
    );
    if (deletedView.rowCount < 1) {
      throw new ViewLifecycleError("View deletion failed", 500);
    }
    await pgClient.query(
      `UPDATE mx_projects
       SET views_external = views_external - $1::text[]
       WHERE views_external ?| $1::text[]`,
      [[idView]],
    );

    let idSourceDeleted = null;
    if (
      source?.type === "external" &&
      source.project === idProject &&
      isSourceId(idSource)
    ) {
      const reference = await pgClient.query(
        `SELECT 1
         FROM mx_views_latest
         WHERE data #>> '{source,metadataId}' = $1
         LIMIT 1`,
        [idSource],
      );
      if (reference.rowCount === 0) {
        const deletedSource = await pgClient.query(
          "DELETE FROM mx_sources WHERE id = $1",
          [idSource],
        );
        if (deletedSource.rowCount < 1) {
          throw new ViewLifecycleError(
            "External metadata deletion failed",
            500,
          );
        }
        idSourceDeleted = idSource;
      }
    }

    if (ownsClient) await pgClient.query("COMMIT");
    return { ok: true, idView, idSourceDeleted };
  } catch (error) {
    if (ownsClient) await pgClient.query("ROLLBACK");
    throw error;
  } finally {
    if (ownsClient) pgClient.release();
  }
}

function sendLifecycleError(res, error) {
  res.status(error.status || 500).json({
    ok: false,
    message: error.message || "View lifecycle operation failed",
  });
}

async function createHandler(req, res) {
  try {
    res.json(await createExternalMetadataView(req.body || {}));
  } catch (error) {
    sendLifecycleError(res, error);
  }
}

async function deleteHandler(req, res) {
  try {
    res.json(await deleteViewWithExternalMetadata(req.body || {}));
  } catch (error) {
    sendLifecycleError(res, error);
  }
}

export const mwCreateExternalMetadataView = [
  express.json({ limit: "2mb" }),
  validateTokenHandler,
  createHandler,
];

export const mwDeleteView = [
  express.json({ limit: "256kb" }),
  validateTokenHandler,
  deleteHandler,
];
