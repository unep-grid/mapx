import { pgRead } from "#mapx/db";
/**
 * Helper used in schema mx_validate
 */
export async function validateJoins(config, client = pgRead) {
  try {
    const joins = config.joins;

    for (const join of joins) {
      const query = `
SELECT 
    a.data_type AS base_type, 
    b.data_type AS join_type 
FROM 
    information_schema.columns a, 
    information_schema.columns b 
WHERE 
    a.table_name = $1 AND 
    a.column_name = $2 AND 
    b.table_name = $3 AND 
    b.column_name = $4
            `;

      const res = await client.query(query, [
        config.base.id_source,
        join.column_base,
        join.id_source,
        join.column_join,
      ]);

      if (res.rowCount === 0) {
        return false; // No matching columns found
      }

      if (res.rows[0].base_type !== res.rows[0].join_type) {
        return false; // Incompatible types
      }
    }

    return true; // All joins are compatible
  } catch (error) {
    console.error(error);
    return false; // Return false in case of any error
  }
}
