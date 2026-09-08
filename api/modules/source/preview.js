// @ts-check
import crypto from "crypto";
import { pgRead, redisGet, redisSet } from "#mapx/db";
import { getSourceLastTimestamp } from "#mapx/db_utils";
import { parseTemplate } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { isSourceId } from "@fxi/mx_valid";
import { sourceIsAccessible } from "./browser.js";
import { quoteIdentifier } from "./join/sql_builder.js";

const PREVIEW_WIDTH = 64;
const PREVIEW_HEIGHT = 36;
const BIN_SIZE = 3;
const MAX_PAYLOAD_BYTES = 24_000;
const CACHE_PREFIX = "source-preview";

function cacheKey(idSource, timestamp) {
  const hash = crypto
    .createHash("md5")
    .update(`${idSource}:${timestamp}`)
    .digest("hex");
  return `${CACHE_PREFIX}:${hash}`;
}

function parseCachedPreview(value) {
  if (!value) {
    return null;
  }
  try {
    const preview = JSON.parse(value);
    return preview?.kind === "vector" ? preview : null;
  } catch {
    return null;
  }
}

/**
 * Generate a fixed-size, attribute-free vector preview.
 *
 * @param {string} idSource
 * @param {any} [client]
 * @returns {Promise<Record<string, any> | null>}
 */
export async function generateSourcePreview(idSource, client = pgRead) {
  if (!isSourceId(idSource)) {
    throw new Error("source_id_invalid");
  }
  const sql = parseTemplate(templates.getSvgSourcePreview, {
    layer: quoteIdentifier(idSource),
    layer_name: idSource,
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    bin_size: BIN_SIZE,
    max_payload_bytes: MAX_PAYLOAD_BYTES,
  });
  const result = await client.query(sql);
  const preview = result.rows[0]?.preview || null;
  if (
    preview &&
    Buffer.byteLength(JSON.stringify(preview)) > MAX_PAYLOAD_BYTES
  ) {
    return null;
  }
  return preview;
}

/**
 * @param {any} socket
 * @param {string} idSource
 * @param {string | null} [viewId]
 * @param {{
 *   client?: any,
 *   redisGetFn?: typeof redisGet,
 *   redisSetFn?: typeof redisSet,
 *   getTimestamp?: typeof getSourceLastTimestamp
 * }} [dependencies]
 */
export async function getSourcePreview(
  socket,
  idSource,
  viewId = null,
  dependencies = {},
) {
  if (!isSourceId(idSource)) {
    throw new Error("source_id_invalid");
  }
  const {
    client = pgRead,
    redisGetFn = redisGet,
    redisSetFn = redisSet,
    getTimestamp = getSourceLastTimestamp,
  } = dependencies;
  if (!(await sourceIsAccessible(socket, idSource, client, viewId))) {
    throw new Error("source_preview_access_denied");
  }
  const source = await client.query(
    `SELECT type FROM mx_sources_latest WHERE id = $1`,
    [idSource],
  );
  if (source.rows[0]?.type !== "vector") {
    return null;
  }

  const timestamp = await getTimestamp(idSource, client);
  const key = cacheKey(idSource, timestamp);
  const cached = parseCachedPreview(await redisGetFn(key));
  if (cached) {
    return cached;
  }

  const preview = await generateSourcePreview(idSource, client);
  if (preview) {
    await redisSetFn(key, JSON.stringify(preview));
  }
  return preview;
}

export async function ioSourcePreviewGet(socket, request, cb) {
  const response = {};
  try {
    response.preview = await getSourcePreview(
      socket,
      request?.idSource,
      request?.viewId,
    );
    response.success = true;
  } catch (error) {
    response.error = error?.message || String(error);
  } finally {
    cb(response);
  }
}

export const sourcePreviewInternals = {
  BIN_SIZE,
  CACHE_PREFIX,
  MAX_PAYLOAD_BYTES,
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  cacheKey,
  parseCachedPreview,
};
