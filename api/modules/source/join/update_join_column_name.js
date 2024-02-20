import { pgRead } from "#mapx/db";
import { updateViewsAttribute } from "#mapx/db_utils";
import { templates } from "#mapx/template";
import { emitUpdateViews, stopIfNotValid, updateJoin, updatePgView } from ".";

export async function updateJoinColumnsNames(
  idSourceUpdate,
  oldColumnName,
  newColumnName,
  client = pgRead,
  socket = null
) {
  try {
    const sourcesToUpdate = await getSourcesToUpdate(idSourceUpdate, client);
    if (sourcesToUpdate.length === 0) {
      return false;
    }

    for (const { data, id: idSource } of sourcesToUpdate) {
      const updates = compileUpdates(
        data,
        idSourceUpdate,
        oldColumnName,
        newColumnName
      );

      if (updates.length > 0) {
        await applyUpdatesAndEmitViews(updates, data, client, socket);
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating join column names:", error);
    throw error;
  }
}

async function getSourcesToUpdate(idSourceUpdate, client) {
  const query = templates.getSourceJoinDataUsingSourceId;
  const { rows } = await client.query(query, [idSourceUpdate]);
  return rows;
}

function compileUpdates(data, idSourceUpdate, oldColumnName, newColumnName) {
  const updates = [];
  const { join: joinConfig } = data;
  const { base, joins } = joinConfig;

  if (base.id_source === idSourceUpdate) {
    const baseColumnIndex = base.columns.indexOf(oldColumnName);
    if (baseColumnIndex !== -1) {
      updates.push({
        id_source: joinConfig.id_source,
        old_column: oldColumnName,
        new_column: newColumnName,
      });
    }
  }

  for (const join of joins) {
    if (join.id_source !== idSourceUpdate) {
      continue;
    }
    const columnIndex = join.columns.indexOf(oldColumnName);
    if (columnIndex === -1) {
      continue;
    }
    join.columns[columnIndex] = newColumnName;
    updates.push({
      id_source: joinConfig.id_source,
      old_column: `${join._prefix}${oldColumnName}`,
      new_column: `${join._prefix}${newColumnName}`,
    });
  }

  return updates;
}

async function applyUpdatesAndEmitViews(updates, joinConfig, client, socket) {
  await stopIfNotValid(joinConfig, client);
  await updatePgView(joinConfig, client);
  await updateJoin(joinConfig, client);

  for (const update of updates) {
    const views = await updateViewsAttribute(
      update.id_source,
      update.old_column,
      update.new_column,
      client
    );
    await emitUpdateViews(views, socket);
  }
}
