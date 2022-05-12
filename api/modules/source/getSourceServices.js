import { templates } from "#mapx/template";
import { parseTemplate } from "#mapx/helpers";
import { pgRead } from "#mapx/db";

export async function getSourcesServicesProject(idProject) {
  const sql = parseTemplate(templates.getSourcesServicesProject, {
    project: idProject,
  });
  const res = await pgRead.query(sql);
  const data = res.rows;
  return data;
}
