import { isRoot, isProjectCreator } from "#mapx/authentication";
import { validate } from "./validate.js";
import { isProjectId, isNotEmpty } from "@fxi/mx_valid";
import { randomString } from "#mapx/helpers";
import { insertRow } from "#mapx/db_utils";

export async function ioProjectCreate(socket, data, cb) {
  try {
    const auth = isRoot(socket) || isProjectCreator(socket);
    if (!auth) {
      throw new Error("project_manage_creation_not_allowed");
    }
    const issues = await validate(data.name);
    if (isNotEmpty(issues)) {
      throw new Error("project_manage_name_not_valid");
    }
    const idUser = socket.session.user_id;
    const project = await addProject(idUser, data.name);
    Object.assign(data, project);
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

async function addProject(idUser, name) {
  const idProject = randomString("MX", 5, 3, false, true, "-");

  if (!isProjectId(idProject)) {
    throw new Error("Ivalid project id");
  }

  const project = {
    id: idProject,
    title: { en: name },
    description: { en: "" },
    countries: [],
    active: true,
    public: false,
    creator: idUser,
    admins: [idUser],
    members: [],
    publishers: [],
    contacts: [idUser],
    date_modified: new Date(),
    date_created: new Date(),
    map_position: { lat: 0, lng: 0, zoom: 1 },
    views_external: [],
    alias: "",
    states_views: [],
  };

  await insertRow(project, "mx_projects");

  return project;
}
