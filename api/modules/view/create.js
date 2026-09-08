import { isViewId } from "@fxi/mx_valid";
import { newIdView } from "./id.js";

const MAX_ID_ATTEMPTS = 5;

/**
 * Insert the first revision of a view using a server-generated unique ID.
 *
 * The advisory lock and existence check make allocation atomic for callers
 * using this boundary, while retaining mx_views' revision-table semantics.
 */
export async function insertNewView(
  { editor, data, type, project, readers = [], editors = [] },
  client,
) {
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    const idView = newIdView();
    if (!isViewId(idView)) {
      continue;
    }

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
      [idView],
    );
    const inserted = await client.query(
      `INSERT INTO mx_views (
         id, editor, date_modified, data, type, project, readers, editors
       )
       SELECT $1::text, $2::integer, NOW(), $3::jsonb, $4, $5,
              $6::jsonb, $7::jsonb
       WHERE NOT EXISTS (SELECT 1 FROM mx_views WHERE id = $1::text)
       RETURNING id, editor, date_modified, data, type, project,
                 readers, editors`,
      [
        idView,
        Number(editor),
        JSON.stringify(data),
        type,
        project,
        JSON.stringify(readers),
        JSON.stringify(editors),
      ],
    );
    if (inserted.rowCount === 1) {
      return inserted.rows[0];
    }
  }

  throw new Error("Could not allocate a unique view identifier");
}
