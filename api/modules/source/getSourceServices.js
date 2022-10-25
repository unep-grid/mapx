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

export async function getSourceServices(idSource) {
  const sql = parseTemplate(templates.getSourceServices, {
    idSource,
  });
  const res = await pgRead.query(sql);
  if (res.rows.length === 0) {
    return [];
  }
  return res.rows[0].services;
}

export async function sourceHasService(idSource, name) {
  const services = await getSourceServices(idSource);
  return services.includes(name);
}
