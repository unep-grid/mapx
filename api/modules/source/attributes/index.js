import { getColumnsTypesSimple } from "#mapx/db_utils";

export { ioSourceListColumns };

async function ioSourceListColumns(socket, request, cb) {
  const session = socket.session;

  try {
    if (!session) {
      throw new Error("No session");
    }

    if (!session.user_authenticated || !session.user_roles.publisher) {
      throw new Error("Unautorized");
    }

    const options = {
      id_source: null,
      ignore_attr: ["geom", "gid", "_mx_valid"],
    };

    Object.assign(options, request);
    const columns = await getColumnsTypesSimple(
      options.id_source,
      null,
      options.ignore_attr
    );

    const response = Object.assign({}, request, { columns });

    cb(response);
  } catch (e) {
    cb(false);
    console.error(e);
    await socket.notifyInfoError({
      message: e.message,
    });
  }
}
