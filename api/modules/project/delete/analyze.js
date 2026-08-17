import { assertProjectDeletable } from "./guards.js";
import { getProjectDeleteImpact } from "./impact.js";

/**
 * Read-only preview of what deleting a project would remove.
 * Triggered by '/client/project/delete/analyze' in ../../../index.js
 */
export async function ioProjectDeleteAnalyze(socket, data, cb) {
  const response = {};
  try {
    const idProject = data?.id_project;
    const { title } = await assertProjectDeletable(socket, idProject, {
      language: data?.language,
    });
    const impact = await getProjectDeleteImpact(idProject, data?.language);
    Object.assign(response, impact, {
      id_project: idProject,
      project_title: title,
      success: true,
    });
  } catch (error) {
    response.error = error?.message || String(error);
  } finally {
    cb(response);
  }
}
