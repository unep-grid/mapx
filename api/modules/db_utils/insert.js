import { pgWrite } from "#mapx/db";
import { isArray, isObject } from "@fxi/mx_valid";
import { clone } from "#mapx/helpers";

export async function insertRow(rowOrig, tableName) {
  const client = await pgWrite.connect();

  try {
    const row = clone(rowOrig);
    await client.query("BEGIN"); // Start transaction

    const keys = Object.keys(row).join(",");
    const placeholders = Object.keys(row)
      .map((_, index) => `$${index + 1}`)
      .join(",");
    const values = Object.values(row).map((value) => {
      if (isArray(value) || isObject(value)) {
        value = JSON.stringify(value);
      }
      return value;
    });

    const sql = `INSERT INTO ${tableName} (${keys}) VALUES (${placeholders}) RETURNING *`;

    const result = await client.query(sql, values);

    if (result.rowCount !== 1) {
      throw new Error(
        `Expected 1 row to be inserted, but got ${result.rowCount} rows.`
      );
    }

    await client.query("COMMIT"); // Commit transaction

    return result.rows[0]; // Return the inserted row
  } catch (err) {
    await client.query("ROLLBACK"); // Rollback transaction
    throw err;
  } finally {
    client.release(); // Release the client back to the pool
  }
}
