import { mailValidate, sendMailAuto } from "./index.js";
import { settings } from "#root/settings";
import { RateLimiter } from "#mapx/io";
import { isArrayOf, isEmail } from "@fxi/mx_valid";
import { pgRead } from "#mapx/db";

const rateLimiter = new RateLimiter({
  limit: 5,
  //interval: 60 * 60 * 1e3,
  interval: 60 * 1e3,
});

export async function ioMailReportIssue(socket, data, cb) {
  try {
    await rateLimiter.check(socket.handshake.address, 1);
    await send(data);
    cb({
      ok: true,
    });
  } catch (e) {
    cb({
      type: "error",
      message: e?.message || e,
      ok: false,
    });
  }
}

async function send(data) {
  const flag = "[ISSUE REPORTED]";

  const emailContent = generateEmailContent(data);
  const recipients = await getRecipients(data);

  debugger;

  if (!isArrayOf(recipients, isEmail)) {
    throw new Error("No valid recipients found");
  }

  const conf = {
    from: "bot@mapx.org",
    to: recipients,
    title: flag,
    subject: `${flag} : ${data.subject}`,
    content: emailContent,
  };

  const validation = mailValidate(conf);
  if (!validation.ok) {
    throw new Error("Invalid request");
  }

  await sendMailAuto(conf);
  data.ok = true;
}

async function getRecipients(data) {
  const { type, _context } = data;
  const { project, id_views } = _context;

  const recipients = [];

  switch (type) {
    case "view_dashboard_issue":
      {
        const vEmails = await getEmailsViews(id_views);
        recipients.push(...vEmails);
      }
      break;
    case "project_issue":
      {
        const pEmails = await getEmailsProject(project);
        recipients.push(...pEmails);
      }
      break;

    case "bug_feature_request":
    case "admin_issue":
    default:
      recipients.push(settings.mail.config.emailAdmin);
  }

  return Array.from(new Set(recipients));
}

async function getEmailsProject(idProject = "") {
  const sql = `
    WITH project_data AS (
      SELECT jsonb_array_elements_text(contacts || admins) AS user_id
      FROM mx_projects
      WHERE id = $1
    )
    SELECT DISTINCT u.email
    FROM mx_users u
    JOIN project_data pd ON u.id::text = pd.user_id
  `;
  const { rows } = await pgRead.query(sql, [idProject]);
  return rows.map((row) => row.email);
}

async function getEmailsViews(views = []) {
  const sql = `
    SELECT DISTINCT u.email
    FROM mx_users u
    JOIN mx_views_latest v ON v.editor = u.id
    WHERE v.id = ANY($1::text[])
  `;
  const { rows } = await pgRead.query(sql, [views]);
  return rows.map((row) => row.email);
}

function generateEmailContent(data) {
  const formatJSON = (obj) => JSON.stringify(obj, null, 2);

  const capitalize = (str) =>
    str.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  let content = `
    <h2>Issue Report Details</h2>
    <h3>Type</h3>
    <span>${capitalize(data.type)}</span>
    <h3>Priority</h3>
    <span>${capitalize(data.priority)}</span>
    <h3>Subject</h3>
    <span>${data.subject}</span>
    <h3>Description</h3>
    <span>${data.description.replace(/\n/g, "<br>")}</span>
  `;

  if (data.contactEmail) {
    content += `
      <h3>Contact Email</h3>
      <span>${data.contactEmail}</span>
    `;
  }

  if (data.includeMapConfig) {
    content += `
      <h3>Map Configuration</h3>
      <pre>${formatJSON(data._context.map_config)}</pre>
    `;
  }

  if (data.includeActivatedViews) {
    content += `
      <h3>Activated Views</h3>
      <pre>${formatJSON(data._context.id_views)}</pre>
    `;
  }

  content += `
    <h3>Project</h3>
    <span>${data._context.project}</span>
  `;

  return content;
}
