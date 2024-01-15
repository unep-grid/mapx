import { readTxt, parseTemplate } from "#mapx/helpers";
import { pgAdmin } from "#mapx/db";
import path from "path";
import fs from "fs";

/**
 * ROLL FORWARD ONLY migration patches
 */

/**
 * Paths
 */
const dirSqlPatches = new URL("sql_patches", import.meta.url).pathname;
//const dirSqlRoutines = path.join(__dirname, 'sql_routines') # not used
const dirSqlBase = new URL("sql_base", import.meta.url).pathname;
const dirSqlAdmin = new URL("sql_admin", import.meta.url).pathname;

/*
 * Load sql/templates
 */
const sqlHasPatch = readTxt(path.join(dirSqlBase, "has_patch.template.sql"));
const sqlRegisterPatch = readTxt(
  path.join(dirSqlBase, "register_patch.template.sql")
);
const sqlInit = readTxt(path.join(dirSqlBase, "init.sql"));
const sqlIsInit = readTxt(path.join(dirSqlBase, "exists.sql"));

/**
 * Apply patch with logs
 */
export async function apply() {
  try {
    const r = await applyPatches();
    if (r.length > 0) {
      console.log(`Migrate : applied patches \n ${r.join(",\n")}`);
    } else {
      console.log(`Migrate : No patch applied`);
    }
  } catch (e) {
    /*
     * Handled in parent, e.g. once / withTimeLimit
     */
    throw Error(e);
  }
}

/**
 * Helpers
 */
async function applyPatches() {
  const applied = [];

  // With transaction
  const patches = fs
    .readdirSync(dirSqlPatches)
    .filter((f) => f.match(/\.sql$/))
    .sort();

  // No transaction
  const patchesAdmin = fs
    .readdirSync(dirSqlAdmin)
    .filter((f) => f.match(/\.sql$/))
    .sort();

  /**
   * Init patch table
   */

  const res = await pgAdmin.query(sqlIsInit);
  const init = (res.rows[0] || {}).exists === true;
  if (!init) {
    await pgAdmin.query(sqlInit);
  }

  /**
   * No transaction patches ( repeatable admin stuff )
   */
  for (let p of patchesAdmin) {
    const fInfo = path.parse(p);
    const id = fInfo.name;
    const sqlHas = parseTemplate(sqlHasPatch, { id });
    const sqlReg = parseTemplate(sqlRegisterPatch, { id });
    /**
     * Don't apply patch more than once
     */

    const resHas = await pgAdmin.query(sqlHas);
    if (!resHas.rowCount > 0) {
      const sqlPatch = readTxt(path.join(dirSqlAdmin, fInfo.base));
      await pgAdmin.query(sqlPatch);
      await pgAdmin.query(sqlReg);
      applied.push(id);
    }
  }

  /**
   * Transactional patches applying ( once and once only )
   */

  const client = await pgAdmin.connect();
  try {
    await client.query("BEGIN");
    /**
     * LOCK
     * - because we don't want another process
     *   do the same operation at the same time
     * - Lock released when commit/rollback.
     */
    await client.query("LOCK mx_patches");

    for (let p of patches) {
      const fInfo = path.parse(p);
      const id = fInfo.name;
      const sqlHas = parseTemplate(sqlHasPatch, { id });
      const sqlReg = parseTemplate(sqlRegisterPatch, { id });
      /**
       * Don't apply patch more than once
       */

      const resHas = await client.query(sqlHas);
      if (!resHas.rowCount > 0) {
        const sqlPatch = readTxt(path.join(dirSqlPatches, fInfo.base));
        try {
          await client.query(sqlPatch);
          await client.query(sqlReg);
          applied.push(id);
        } catch (e) {
          /**
           * Log an error + stop early, this should be rollbacked
           */
          console.error(`Patch ${id} not applied`, e);
          throw Error(e);
        }
      }
    }
    client.query("COMMIT");
  } catch (e) {
    /*
     * Rollack and propagate
     */
    client.query("ROLLBACK");
    throw Error(e);
  } finally {
    client.release();
  }
  return applied;
}
