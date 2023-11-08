import { pgWrite } from "#mapx/db";
import { settings } from "#root/settings";
import { templates } from "#mapx/template";
const languages = settings.validation_defaults.languages.codes;

/*
 * Populate an empty language item
 */
const emptyLanguageItem = {};
for (const language of languages) {
  emptyLanguageItem[language] = "";
}

// Helper to add a new column metadata
export async function addColumnMetadata(
  id,
  newColumnName,
  db_client = pgWrite
) {
  try {
    const emptyItemString = JSON.stringify(emptyLanguageItem);
    const query = templates.updateMetaSourceAttributesAdd;
    const res = await db_client.query(query, [
      id,
      newColumnName,
      emptyItemString,
    ]);
    if (res.rowCount > 1) {
      throw new Error("N rows affected > 1");
    }
  } catch (error) {
    console.error("Error adding column metadata:", error);
    throw error;
  }
}

// Helper to rename a column metadata
export async function renameColumnMetadata(
  id,
  oldColumnName,
  newColumnName,
  db_client = pgWrite
) {
  try {
    const query = templates.updateMetaSourceAttributesRename;
    const res = await db_client.query(query, [
      id,
      oldColumnName,
      newColumnName,
    ]);
    if (res.rowCount > 1) {
      throw new Error("N rows affected > 1");
    }
  } catch (error) {
    console.error("Error renaming column metadata:", error);
    throw error;
  }
}

// Helper to remove a column metadata
export async function removeColumnMetadata(
  id,
  columnName,
  db_client = pgWrite
) {
  try {
    const query = templates.updateMetaSourceAttributesRemove;
    const res = await db_client.query(query, [id, columnName]);
    if (res.rowCount > 1) {
      throw new Error("N rows affected > 1");
    }
  } catch (error) {
    console.error("Error removing column metadata:", error);
    throw error;
  }
}

// Helper to duplicate a column metadata
export async function duplicateColumnMetadata(
  id,
  sourceColumnName,
  newColumnName,
  db_client = pgWrite
) {
  try {
    const query = templates.updateMetaSourceAttributesDuplicate;
    const res = await db_client.query(query, [
      id,
      sourceColumnName,
      newColumnName,
    ]);
    if (res.rowCount > 1) {
      throw new Error("N rows affected > 1");
    }
  } catch (error) {
    console.error("Error duplicating column metadata:", error);
    throw error;
  }
}
