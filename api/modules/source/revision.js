import { pgWrite } from "#mapx/db";
import { isSourceId } from "@fxi/mx_valid";
import { prepareRevisionValue } from "./revision_values.js";

const revisionColumns = [
  "id",
  "editor",
  "target",
  "data",
  "type",
  "project",
  "readers",
  "editors",
  "services",
  "validated",
  "global",
];

function cloneJson(value) {
  if (value === null || value === undefined) {
    return value;
  }
  return structuredClone(value);
}

function cloneRevision(row) {
  const revision = { ...row };
  delete revision.pid;
  delete revision.date_modified;
  for (const key of ["target", "data", "readers", "editors", "services"]) {
    revision[key] = cloneJson(revision[key]);
  }
  return revision;
}

async function insertRevision(client, revision) {
  const values = revisionColumns.map((column) =>
    prepareRevisionValue(column, revision[column]),
  );
  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  const query = `
    INSERT INTO mx_sources (${revisionColumns.join(", ")}, date_modified)
    VALUES (${placeholders}, NOW())
    RETURNING *
  `;
  const result = await client.query(query, values);
  if (result.rowCount !== 1) {
    throw new Error(`Expected one source revision, got ${result.rowCount}`);
  }
  return result.rows[0];
}

/**
 * Insert an immutable revision of a registered source.
 *
 * The per-source advisory lock prevents two writers from copying the same
 * revision concurrently. Callers may supply a client when the source change
 * is part of a larger transaction.
 *
 * @param {Object} options
 * @param {string} options.idSource
 * @param {number} options.idUser authenticated actor
 * @param {(revision: Object) => (void|Promise<void>)} [options.mutate]
 * @param {Object} [options.client]
 * @returns {Promise<Object>} inserted revision
 */
export async function createSourceRevision({
  idSource,
  idUser,
  mutate = null,
  client = null,
}) {
  if (!isSourceId(idSource)) {
    throw new Error(`Invalid source id: ${idSource}`);
  }
  if (!Number.isInteger(Number(idUser))) {
    throw new Error("A source revision requires an authenticated actor");
  }

  const ownsClient = !client;
  const pgClient = client || (await pgWrite.connect());
  try {
    if (ownsClient) {
      await pgClient.query("BEGIN");
    }

    await pgClient.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
      [idSource],
    );
    const current = await pgClient.query(
      `SELECT * FROM mx_sources
       WHERE id = $1
       ORDER BY pid DESC
       LIMIT 1`,
      [idSource],
    );
    if (current.rowCount !== 1) {
      throw new Error(`Source not registered: ${idSource}`);
    }

    const revision = cloneRevision(current.rows[0]);
    revision.editor = Number(idUser);
    if (mutate) {
      await mutate(revision);
    }
    revision.id = idSource;
    revision.editor = Number(idUser);

    const inserted = await insertRevision(pgClient, revision);
    if (ownsClient) {
      await pgClient.query("COMMIT");
    }
    return inserted;
  } catch (error) {
    if (ownsClient) {
      await pgClient.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (ownsClient) {
      pgClient.release();
    }
  }
}

/**
 * Set a nested value on a source data object and insert the result.
 */
export function setSourceDataRevision({
  idSource,
  idUser,
  path,
  value,
  client = null,
}) {
  if (!Array.isArray(path) || path.length === 0) {
    throw new Error("A non-empty source data path is required");
  }
  return createSourceRevision({
    idSource,
    idUser,
    client,
    mutate(revision) {
      revision.data ||= {};
      let parent = revision.data;
      for (const key of path.slice(0, -1)) {
        parent[key] ||= {};
        parent = parent[key];
      }
      parent[path.at(-1)] = cloneJson(value);
    },
  });
}

/** Collect several mutations into one revision per source and transaction. */
export class SourceRevisionBatch {
  constructor(client, idUser) {
    if (!client?.query) {
      throw new Error("A source revision batch requires a database client");
    }
    if (!Number.isInteger(Number(idUser))) {
      throw new Error("A source revision batch requires an authenticated actor");
    }
    this.client = client;
    this.idUser = Number(idUser);
    this.revisions = new Map();
  }

  async get(idSource) {
    if (!isSourceId(idSource)) {
      throw new Error(`Invalid source id: ${idSource}`);
    }
    if (this.revisions.has(idSource)) {
      return this.revisions.get(idSource);
    }
    await this.client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
      [idSource],
    );
    const current = await this.client.query(
      `SELECT * FROM mx_sources
       WHERE id = $1
       ORDER BY pid DESC
       LIMIT 1`,
      [idSource],
    );
    if (current.rowCount !== 1) {
      throw new Error(`Source not registered: ${idSource}`);
    }
    const revision = cloneRevision(current.rows[0]);
    revision.editor = this.idUser;
    this.revisions.set(idSource, revision);
    return revision;
  }

  async mutate(idSource, mutate) {
    const revision = await this.get(idSource);
    await mutate(revision);
    revision.id = idSource;
    revision.editor = this.idUser;
    return revision;
  }

  async touch(idSource) {
    return this.get(idSource);
  }

  async save() {
    const inserted = [];
    for (const revision of this.revisions.values()) {
      inserted.push(await insertRevision(this.client, revision));
    }
    return inserted;
  }
}
