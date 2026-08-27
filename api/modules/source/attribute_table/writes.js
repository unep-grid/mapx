import { pgWrite } from "#mapx/db";
import { isEmpty, isNumeric, isSourceId, isSafeName } from "@fxi/mx_valid";
import {
  columnExists,
  columnsExist,
  getColumnsTypesSimple,
  renameTableColumn,
  duplicateTableColumn,
  removeTableColumn,
  addTableColumn,
  setMxSourceData,
  renameColumnMetadata,
  addColumnMetadata,
  getColumnCells,
  duplicateColumnMetadata,
  removeColumnMetadata,
  updateTableCellByGid,
  updateViewsAttributeBatch,
  deleteRowByGid,
  updateLayerExtentMeta,
} from "#mapx/db_utils";
import { SourceRevisionBatch, updateJoinColumnsNames } from "#mapx/source";
import { events } from "./events.js";
import { cols, insertTableRow, updateFeatureGeometry } from "./geometry.js";
import { getSourceIdentityStatus } from "./identity.js";

/**
 * Apply a message's updates in one transaction.
 *
 * Each update type has a handler receiving a shared context :
 * - client        : pg client, inside the transaction
 * - update        : the update object ( mutated to enrich the dispatch )
 * - message       : the container message ( e.g. _include_sender flag )
 * - session       : EditTableSession ( emitSpread, lock checks, ... )
 * - postScripts   : Map of scripts run once, after COMMIT
 * - tablesUpdated : tables needing a source timestamp update
 *
 * @param {EditTableSession} session
 * @param {Object} message
 */
export async function writeUpdates(session, message) {
  const { updates } = message;
  if (isEmpty(updates)) {
    return;
  }
  const postScripts = new Map();
  const tablesUpdated = new Set();
  const client = await pgWrite.connect();
  const revisions = new SourceRevisionBatch(client, session._id_user);
  await client.query("BEGIN");

  try {
    const identity = await getSourceIdentityStatus(session._id_table, client);
    if (!identity.valid) {
      throw new Error(
        `Source gid identity is invalid: ${identity.issues.join(", ")}`,
      );
    }
    for (const update of updates) {
      if (!isSourceId(update.id_table)) {
        throw new Error("Invalid update table");
      }
      if (update.id_table !== session._id_table) {
        throw new Error("Update table does not match edit session");
      }
      const handler = handlers[update.type];
      if (!handler) {
        throw new Error(`Unknown update type: ${update.type}`);
      }
      await handler({
        client,
        update,
        message,
        session,
        postScripts,
        tablesUpdated,
        revisions,
      });
    }

    for (const id_table of tablesUpdated) {
      await revisions.touch(id_table);
    }
    await revisions.save();

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  /**
   * Scripts that require the committed state
   * ( i.e. updated views, source, meta )
   */
  for (const script of postScripts.values()) {
    await script();
  }
}

const handlers = {
  order_columns: handlerOrderColumns,
  update_cell: handlerUpdateCell,
  add_column: handlerAddColumn,
  remove_column: handlerRemoveColumn,
  duplicate_column: handlerDuplicateColumn,
  rename_column: handlerRenameColumn,
  remove_rows: handlerRemoveRows,
  add_row: handlerAddRow,
  update_geom: handlerUpdateGeom,
};

async function handlerOrderColumns({ client, update, session, revisions }) {
  const { id_table, columns_order } = update;
  const colsExistOk = await columnsExist(columns_order, id_table, client);
  if (!colsExistOk) {
    throw new Error(`Invalid columns order: unknown columns`);
  }
  await setMxSourceData(
    id_table,
    ["settings", "editor", "columns_order"],
    columns_order,
    session._id_user,
    client,
    revisions,
  );
}

async function handlerUpdateCell({ client, update, tablesUpdated }) {
  const { id_table, column_name, column_type, gid, value_new } = update;

  if (!isSafeName(column_name)) {
    throw new Error("Invalid update column");
  }

  const valid = isNumeric(gid);
  const colExists = await columnExists(column_name, id_table, client);

  if (valid && colExists) {
    await updateTableCellByGid(
      id_table,
      gid,
      column_name,
      column_type,
      value_new,
      client
    );
    tablesUpdated.add(id_table);
  }
}

async function handlerAddColumn({
  client,
  update,
  message,
  session,
  tablesUpdated,
  revisions,
}) {
  const { id_table, column_name, column_type, is_identity } = update;

  if (!isSafeName(column_name)) {
    throw new Error("Invalid update column");
  }

  const colExists = await columnExists(column_name, id_table, client);
  if (colExists) {
    return;
  }

  await addTableColumn(id_table, column_name, column_type, is_identity, client);
  await addColumnMetadata(
    id_table,
    column_name,
    session._id_user,
    client,
    revisions,
  );
  tablesUpdated.add(id_table);

  if (is_identity) {
    update._column_config = {
      type: await getColumnsTypesSimple(id_table, column_name),
      rows: await getColumnCells(id_table, column_name, client),
    };
    message._include_sender = true;
  }
}

async function handlerRemoveColumn({
  client,
  update,
  session,
  tablesUpdated,
  revisions,
}) {
  const { id_table, column_name } = update;
  const colExists = await columnExists(column_name, id_table, client);
  if (!colExists) {
    return;
  }
  await removeTableColumn(id_table, column_name, client);
  await removeColumnMetadata(
    id_table,
    column_name,
    session._id_user,
    client,
    revisions,
  );
  tablesUpdated.add(id_table);
}

async function handlerDuplicateColumn({
  client,
  update,
  session,
  tablesUpdated,
  revisions,
}) {
  const { id_table, column_name, column_name_new } = update;
  await duplicateTableColumn(id_table, column_name, column_name_new, client);
  await duplicateColumnMetadata(
    id_table,
    column_name,
    column_name_new,
    session._id_user,
    client,
    revisions,
  );
  tablesUpdated.add(id_table);
}

async function handlerRenameColumn({
  client,
  update,
  session,
  postScripts,
  tablesUpdated,
  revisions,
}) {
  const { id_table, column_name, column_name_new } = update;

  /**
   * Table and metadata
   */
  await renameTableColumn(id_table, column_name, column_name_new, client);
  await renameColumnMetadata(
    id_table,
    column_name,
    column_name_new,
    session._id_user,
    client,
    revisions,
  );
  tablesUpdated.add(id_table);

  /**
   * Update joins
   */
  const joinUpdates = await updateJoinColumnsNames(
    id_table,
    column_name,
    column_name_new,
    client,
    session._id_user,
    revisions,
  );

  /**
   * Update views's attribute, considering source update and join updates
   */
  joinUpdates.push({
    id_source: id_table,
    old_column: column_name,
    new_column: column_name_new,
  });

  const views = await updateViewsAttributeBatch(joinUpdates, client);

  postScripts.set(`${id_table}_rename_column_spread`, async () => {
    session.emitSpread(events.server_spread_views_update, {
      views,
    });
    session.emitSpread(events.server_spread_join_editor_update, {
      source_columns_rename: joinUpdates,
    });
    await session.updateAltStyleClient(id_table);
  });
}

async function handlerRemoveRows({
  update,
  session,
  postScripts,
  tablesUpdated,
}) {
  const { id_table, id_rows } = update;
  await deleteRowByGid(id_table, id_rows);
  addExtentPostScript(postScripts, id_table, session._id_user);
  tablesUpdated.add(id_table);
}

async function handlerAddRow({
  client,
  update,
  message,
  session,
  postScripts,
  tablesUpdated,
}) {
  const { id_table } = update;
  const row = await insertTableRow(id_table, update.geom, client);
  update.row = row;
  update.gid = row.gid;
  message._include_sender = true;
  addExtentPostScript(postScripts, id_table, session._id_user);
  tablesUpdated.add(id_table);
}

async function handlerUpdateGeom({
  client,
  update,
  message,
  session,
  postScripts,
  tablesUpdated,
}) {
  const { id_table } = update;
  const allowed = await session.isGeometryEditAllowed(client);
  if (!allowed) {
    throw new Error("Geometry editing is not allowed or is locked");
  }
  const row = await updateFeatureGeometry(
    id_table,
    update.gid,
    update.geom,
    client
  );
  update.row = row;
  update[cols.geom_status] = row[cols.geom_status];
  message._include_sender = true;
  addExtentPostScript(postScripts, id_table, session._id_user);
  tablesUpdated.add(id_table);
}

function addExtentPostScript(postScripts, id_table, idUser) {
  postScripts.set(`${id_table}_update_extent`, async () => {
    try {
      const hasGeom = await columnExists(cols.geom, id_table);
      if (!hasGeom) {
        return;
      }
      await updateLayerExtentMeta(id_table, idUser);
    } catch (e) {
      console.warn("Unable to update layer extent", e.message);
    }
  });
}
