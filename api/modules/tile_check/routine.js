import { checkAllTiles } from "./index.js";

export const TILE_CHECK_ROUTINE_TIMEOUT_MS = 20 * 60 * 1000;
const PROGRESS_INTERVAL = 100;

/**
 * Run the daily tile check with concise progress logs suitable for staging.
 * URLs are deliberately excluded because they may contain sensitive query
 * parameters.
 * @param {Object} [opt]
 * @param {(...args: unknown[]) => void} [opt.log]
 * @returns {Promise<Array>}
 */
export async function tileCheckRoutine(opt = {}) {
  const log = opt.log || console.log;
  const startedAt = Date.now();
  let total = 0;
  let completed = 0;
  let valid = 0;
  let invalid = 0;
  let timeouts = 0;

  const results = await checkAllTiles({
    onPlan: ({ total: planned }) => {
      total = planned;
      log(`Tile check routine started: ${total} views`);
    },
    onDone: (row) => {
      completed += 1;
      if (row.valid === true) {
        valid += 1;
      } else {
        invalid += 1;
      }
      if (row.tile_detail === "timeout" || row.legend_detail === "timeout") {
        timeouts += 1;
      }
      if (completed % PROGRESS_INTERVAL === 0 || completed === total) {
        log(`Tile check routine progress: ${completed}/${total}`);
      }
    },
  });

  const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
  log(
    `Tile check routine completed: ${completed}/${total} in ${durationSeconds}s ` +
      `(valid=${valid}, invalid=${invalid}, timeouts=${timeouts})`,
  );
  return results;
}
