import { pgRead, pgWrite } from "#mapx/db";
import {
  getUserRoles,
  validateRoleHandlerFor,
  validateTokenHandler,
} from "#mapx/authentication";
import { isObject, isProjectId, isSourceId, isViewId } from "@fxi/mx_valid";
import { newIdSource } from "./id.js";

class ExternalMetadataError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function normalizeMetadata(metadata) {
  return isObject(metadata) ? structuredClone(metadata) : {};
}

/** Create a metadata-only catalog source in the authenticated user's project. */
export async function createExternalMetadataSource(
  { idUser, idProject, metadata = {} },
  client = null,
) {
  if (!Number.isInteger(Number(idUser)) || !isProjectId(idProject)) {
    throw new ExternalMetadataError("Invalid external metadata owner");
  }
  const ownsClient = !client;
  const pgClient = client || (await pgWrite.connect());
  try {
    if (ownsClient) await pgClient.query("BEGIN");
    const roles = await getUserRoles(idUser, idProject, pgClient);
    if (roles.publisher !== true) {
      throw new ExternalMetadataError("External metadata creation denied", 403);
    }

    let idSource;
    let inserted;
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      idSource = newIdSource();
      await pgClient.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
        [idSource],
      );
      const result = await pgClient.query(
        `INSERT INTO mx_sources (
           id, editor, date_modified, data, type, project,
           readers, editors, services, validated, global
         )
         SELECT $1::text, $2::integer, NOW(), jsonb_build_object('meta', $4::jsonb),
                'external', $3::text, '["publishers"]'::jsonb,
                '["publishers"]'::jsonb, '[]'::jsonb, false, false
         WHERE NOT EXISTS (SELECT 1 FROM mx_sources WHERE id = $1::text)
         RETURNING id, pid, project, type, data`,
        [idSource, Number(idUser), idProject, normalizeMetadata(metadata)],
      );
      inserted = result.rows[0];
    }
    if (!inserted || !isSourceId(idSource)) {
      throw new ExternalMetadataError(
        "Could not allocate an external metadata identifier",
        500,
      );
    }
    if (ownsClient) await pgClient.query("COMMIT");
    return { ok: true, source: inserted };
  } catch (error) {
    if (ownsClient) await pgClient.query("ROLLBACK");
    throw error;
  } finally {
    if (ownsClient) pgClient.release();
  }
}

/** Validate an optional rt/cc external metadata reference at save time. */
export async function validateExternalMetadataSelection(
  { idUser, idProject, idSource = null, idView = null },
  client = pgRead,
) {
  if (!Number.isInteger(Number(idUser)) || !isProjectId(idProject)) {
    return { valid: false, idSource: null };
  }
  if (idSource === null || idSource === undefined || idSource === "") {
    return { valid: true, idSource: null };
  }
  if (!isSourceId(idSource)) return { valid: false, idSource: null };

  const roles = await getUserRoles(idUser, idProject, client);
  if (roles.publisher !== true) return { valid: false, idSource: null };
  const result = await client.query(
    `SELECT s.id
     FROM mx_sources_latest s
     WHERE s.id = $1 AND s.type = 'external'
       AND (
         (s.project = $2 AND (
           s.editor = $3::integer OR s.editors ? $3::text
           OR s.editors ?| $4::text[] OR s.readers ? $3::text
           OR s.readers ?| $4::text[]
         ))
         OR s.global IS TRUE
         OR s.id IN (
           SELECT v.data #>> '{source,metadataId}'
           FROM mx_views_latest v
           WHERE v.id = $5 AND v.project = $2
             AND (v.editor = $3::integer OR v.editors ? $3::text
                  OR v.editors ?| $4::text[])
         )
       )`,
    [
      idSource,
      idProject,
      Number(idUser),
      roles.group || [],
      isViewId(idView) ? idView : null,
    ],
  );
  return {
    valid: result.rowCount === 1,
    idSource: result.rowCount === 1 ? idSource : null,
  };
}

async function selectionHandler(req, res) {
  try {
    const result = await validateExternalMetadataSelection(req.query || {});
    res.status(result.valid ? 200 : 403).json(result);
  } catch (error) {
    res.status(400).json({ valid: false, message: error.message });
  }
}

export const mwValidateExternalMetadataSelection = [
  validateTokenHandler,
  validateRoleHandlerFor("publisher"),
  selectionHandler,
];
