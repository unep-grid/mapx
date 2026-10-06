import { isSourceId, isViewId } from "@fxi/mx_valid";
import { hasSourceDependencies } from "#mapx/source";

/**
 * Remove everything a failed upload may have created, in reverse order:
 * view, source registration (all revisions), then the table. The table is
 * dropped even when the source was never registered. Run it inside a
 * transaction: any error rolls the whole cleanup back.
 *
 * @param {{idSource: string, idView?: string}} ids Ids created by the upload
 * @param {import("pg").PoolClient} client Client in an open transaction
 * @returns {Promise<void>}
 */
export async function discardUpload({ idSource, idView }, client) {
  if (!isSourceId(idSource)) {
    throw new Error(`Invalid source id: ${idSource}`);
  }
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
    [idSource],
  );
  if (isViewId(idView)) {
    await client.query("DELETE FROM mx_views WHERE id = $1::text", [idView]);
  }
  // Only views created outside this upload can remain at this point
  if (await hasSourceDependencies(idSource, client)) {
    throw new Error(`Source ${idSource} has dependencies, not removed`);
  }
  await client.query("DELETE FROM mx_sources WHERE id = $1::text", [idSource]);
  await client.query(`DROP TABLE IF EXISTS ${idSource}`);
}
