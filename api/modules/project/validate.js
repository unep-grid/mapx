import { isRoot } from "#mapx/authentication";
import { settings } from "#root/settings";
import { isStringRange } from "@fxi/mx_valid";
import { pgRead } from "#mapx/db";

export async function ioProjectNameValidate(socket, data, cb) {
  try {
    const auth = isRoot(socket);

    if (!auth) {
      throw new Error("proj_manage_not_allowed");
    }

    data.issues = await validate(data.name);
    data.valid = data.issues.length === 0;
  } catch (e) {
    data.error = e.message;
  } finally {
    cb(data);
  }
}

export async function validate(name) {
  const issues = [];
  const pName = settings.project.name;
  const inRange = isStringRange(name, pName.min, pName.max);

  if (!inRange) {
    issues.push("proj_manage_name_not_in_range");
  }

  const res = await pgRead.query(
    `
      SELECT count(id) count
      FROM 
      mx_projects 
      WHERE lower(title ->> 'en') = lower($1)
      LIMIT 1
    `,
    [name]
  );

  const available = res.rowCount > 0 && res.rows[0].count === 0;

  if (!available) {
    issues.push("proj_manage_name_not_available");
  }

  return issues;
}
