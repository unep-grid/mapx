import { clientRedis } from "#mapx/db";

/**
 * Owned edit locks, one per (table, scope).
 *
 * Redis is in-memory state: locks are ephemeral by design. Every lock
 * carries a TTL and stays alive only while its owner refreshes it
 * (heartbeat / activity). A client that crashes or loses network frees
 * the lock within `ttl_seconds`; a clean exit releases it immediately.
 *
 * Scopes:
 * - "table"    : batch edit (autosave off), blocks concurrent table edits
 * - "geometry" : exclusive geometry edit on the source, blocks any other
 *                session including the same user's other tabs
 */
const def = {
  ttl_seconds: 180,
  scopes: ["table", "geometry"],
};

export const LOCK_TTL_SECONDS = def.ttl_seconds;

function lockKey(idTable, scope) {
  if (!def.scopes.includes(scope)) {
    throw new Error(`Invalid lock scope: ${scope}`);
  }
  return `mx_edit_lock:${idTable}:${scope}`;
}

/**
 * Get the current lock, or null if free
 * @param {String} idTable
 * @param {String} scope table|geometry
 * @return {Promise<Object|null>}
 */
export async function getLock(idTable, scope) {
  const raw = await clientRedis.get(lockKey(idTable, scope));
  return raw ? JSON.parse(raw) : null;
}

/**
 * Test lock ownership
 * @param {Object|null} lock
 * @param {String} idSession
 * @return {Boolean}
 */
export function isLockOwner(lock, idSession) {
  return !!lock && lock.id_session === idSession;
}

/**
 * Acquire a lock, or refresh it if this session already owns it
 * @return {Promise<Object|null>} the lock value, or null if held by another session
 */
export async function acquireLock({
  idTable,
  scope,
  idSession,
  idUser,
  gid = null,
  mode = null,
}) {
  const key = lockKey(idTable, scope);
  const lock = {
    locked: true,
    scope,
    id_session: idSession,
    id_user: idUser,
    gid,
    mode,
    started_at: Date.now(),
  };
  const serialized = JSON.stringify(lock);
  const created = await clientRedis.set(key, serialized, {
    NX: true,
    EX: def.ttl_seconds,
  });
  if (created) {
    return lock;
  }
  const current = await getLock(idTable, scope);
  if (!isLockOwner(current, idSession)) {
    return null;
  }
  await clientRedis.set(key, serialized, { EX: def.ttl_seconds });
  return lock;
}

/**
 * Refresh the TTL if this session owns the lock. No-op otherwise.
 * @return {Promise<Boolean>} refreshed
 */
export async function refreshLock(idTable, scope, idSession) {
  const current = await getLock(idTable, scope);
  if (!isLockOwner(current, idSession)) {
    return false;
  }
  return clientRedis.expire(lockKey(idTable, scope), def.ttl_seconds);
}

/**
 * Release the lock if this session owns it. Releasing a free lock succeeds.
 * @return {Promise<Boolean>} released ( or already free )
 */
export async function releaseLock(idTable, scope, idSession) {
  const current = await getLock(idTable, scope);
  if (!current) {
    return true;
  }
  if (!isLockOwner(current, idSession)) {
    return false;
  }
  await clientRedis.del(lockKey(idTable, scope));
  return true;
}
