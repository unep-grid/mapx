import { pgWrite, pgRead } from "#mapx/db";
import { isViewId, isProjectId } from "@fxi/mx_valid";
import { getView } from "#mapx/view";
export async function ioViewPin(socket, config, cb) {
  try {
    const session = socket.session;

    if (!session.user_roles.publisher) {
      cb(false);
      throw new Error("unauthorized");
    }

    if (!isViewId(config.id_view)) {
      cb(false);
      throw new Error("invalid view");
    }
    if (
      !isProjectId(config.id_project) ||
      config.id_project !== session.project_id
    ) {
      cb(false);
      throw new Error("invalid project");
    }

    const res = await pgRead.query(`
       SELECT views_external 
       FROM mx_projects 
       WHERE id ='${config.id_project}'
      `);
    const viewsExternal = new Set(res.rows[0].views_external);
    viewsExternal.add(config.id_view);
    const viewsExternalStr = JSON.stringify([...viewsExternal]);

    await pgWrite.query(`
       UPDATE mx_projects 
       SET views_external = '${viewsExternalStr}'
      `);

    const view = await getView(config.id_view);

    console.log(`Pin done for ${view.id}`)

    cb(view);
  } catch (e) {
    cb(false);
    socket.notifyInfoError({
      idGroup: config.id_request,
      message: e?.message || e,
    });
  }
}