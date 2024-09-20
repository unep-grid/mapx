import { settings } from "#root/settings";
import { isArrayOf, isEmail } from "@fxi/mx_valid";
import { capitalize, formatJSON, sanitizeData } from "#mapx/helpers";
import { mailValidate, sendMailAuto } from "#mapx/mail";
import { pgRead } from "#mapx/db";
import { uid } from "#mapx/helpers";

/**
 * Class to handle issue reporting logic.
 */
export class IssueReporter {
  /**
   * Initializes a new instance of IssueReporter.
   * @param {Object} data - The issue report data.
   * @param {Object} session - WebSocket session info.
   */
  constructor(data, session) {
    this.data = sanitizeData(data);
    this.origin = session.origin;
    this.project_id = session.project_id;
    this.issue_id = uid();
  }

  /**
   * Composes a view link using the origin and project ID.
   * @param {string} id - The view ID.
   * @param {string} project_id - The project id, used if not session project
   * @returns {string} The composed view link.
   */
  viewLink(id, project_id) {
    return `${this.origin}?viewsOpen=${id}&project=${
      this.project_id || project_id
    }&zoomToViews=true`;
  }

  /**
   * Project link
   */
  projectLink(project_id) {
    return `${this.origin}?project=${
      this.project_id || project_id
    }&zoomToViews=true`;
  }

  /**
   * Retrieves the title of the project.
   * @param {string} projectId - The project ID.
   * @returns {Promise<string>} The project title.
   */
  async getProjectTitle(projectId) {
    const sql = `
      SELECT title->>'en' AS project_title
      FROM mx_projects
      WHERE id = $1
    `;
    const { rows } = await pgRead.query(sql, [projectId]);
    return rows[0]?.project_title || "Untitled Project";
  }

  /**
   * Determines the appropriate handler and sends the email.
   */
  async send() {
    // Get the list of reported views with details
    const reportedViews = await this.getReportedViews();

    switch (this.data.type) {
      case "view_dashboard_issue":
        await this.handleViewDashboardIssue(reportedViews);
        break;
      case "project_issue":
        await this.handleProjectIssue(reportedViews);
        break;
      default:
        await this.handleAdminIssue(reportedViews);
        break;
    }

    // Send acknowledgment if contactEmail is provided and valid
    if (this.data.contactEmail && isEmail(this.data.contactEmail)) {
      await this.sendAcknowledgment();
    }
  }

  /**
   * Sends an acknowledgment email to the submitter.
   */
  async sendAcknowledgment() {
    const acknowledgmentContent = `
      <p>Thank you for submitting your report</p> 
      <p>If your issue is not resolved promptly or in case of emergency, please <a href="mailto:${settings.contact.email_issues}?subject=Issue ${this.issue_id}">contact us directly</a>.</p>
      <b>Issue ID<b>
      <pre>${this.issue_id}</pre>
    `;

    const conf = {
      from: settings.contact.email_bot,
      to: [this.data.contactEmail],
      subject: `Your Issue Report Submission [${this.issue_id}]`,
      content: acknowledgmentContent,
    };

    await this.validateAndSendEmail(conf);
  }

  /**
   * Handles emails for view dashboard issues by sending emails to editors of the affected views.
   * @param {Array<{ id: string, title: string, link: string, editorEmail: string }>} reportedViews - The reported views.
   */
  async handleViewDashboardIssue(reportedViews) {
    if (reportedViews.length === 0) {
      throw new Error("No views reported for view dashboard issue");
    }

    // Group views by editor email
    const viewsByEditor = new Map();

    for (const view of reportedViews) {
      const email = view.editorEmail;
      if (!viewsByEditor.has(email)) {
        viewsByEditor.set(email, []);
      }
      viewsByEditor.get(email).push(view);
    }

    for (const [email, views] of viewsByEditor.entries()) {
      // Generate email content with only the recipient's views
      const emailContent = await this.generateEmailContent(views, false);

      const conf = {
        from: settings.contact.email_bot,
        to: [email],
        subject: `View/Dashboard Issue: ${this.data.subject} [${this.issue_id}]`,
        content: emailContent,
      };

      await this.validateAndSendEmail(conf);
    }
    this.data.ok = true;
  }

  /**
   * Handles emails for project issues by notifying project contacts and including the reported views.
   * @param {Array<{ id: string, title: string, link: string, editorEmail: string }>} reportedViews - The reported views.
   */
  async handleProjectIssue(reportedViews) {
    const recipients = await this.getEmailsProject(this.project_id);

    if (!isArrayOf(recipients, isEmail)) {
      throw new Error("No valid recipients found for project issue");
    }

    // Generate email content including all reported views
    const emailContent = await this.generateEmailContent(reportedViews, true);

    const conf = {
      from: settings.contact.email_bot,
      to: recipients,
      subject: `Project Issue: ${this.data.subject} [${this.issue_id}]`,
      content: emailContent,
    };

    await this.validateAndSendEmail(conf);
    this.data.ok = true;
  }

  /**
   * Handles emails for admin issues by notifying the admin email and including the reported views.
   * @param {Array<{ id: string, title: string, link: string, editorEmail: string }>} reportedViews - The reported views.
   */
  async handleAdminIssue(reportedViews) {
    const recipients = [settings.contact.email_issues];

    // Generate email content including all reported views
    const emailContent = await this.generateEmailContent(reportedViews, true);

    const conf = {
      from: settings.contact.email_bot,
      to: recipients,
      subject: `Admin Issue: ${this.data.subject} [${this.issue_id}]`,
      content: emailContent,
    };

    await this.validateAndSendEmail(conf);
    this.data.ok = true;
  }

  /**
   * Retrieves detailed information about the reported views.
   * @returns {Promise<Array<{ id: string, title: string, link: string, editorEmail: string }>>} An array of view objects.
   */
  async getReportedViews() {
    const views = this.data._context.id_views || [];
    if (views.length === 0) {
      return [];
    }

    const sql = `
    SELECT
      v.id,
      v.project,
      v.data->'title'->>'en' AS title,
      u.email AS editor_email,
      p.title->>'en' AS project_title
    FROM mx_views_latest v
    JOIN mx_users u ON v.editor = u.id
    JOIN mx_projects p ON v.project = p.id
    WHERE v.id = ANY($1::text[])
  `;

    const { rows } = await pgRead.query(sql, [views]);

    return rows.map((row) => ({
      id: row.id,
      title: row.title || "Untitled View",
      link: this.viewLink(row.id, row.project),
      editorEmail: row.editor_email,
      project: row.project,
      project_link: this.projectLink(row.project),
      project_title: row.project_title || "Untitled Project",
    }));
  }

  /**
   * Retrieves the emails of project contacts.
   * @param {string} idProject - The project ID.
   * @returns {Promise<string[]>} An array of email addresses.
   */
  async getEmailsProject(idProject = "") {
    const sql = `
      WITH project_data AS (
        SELECT jsonb_array_elements_text(contacts) AS user_id
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

  /**
   * Generates the email content based on the issue data and views.
   * @param {Array<{ id: string, title: string, link: string, editorEmail: string }>} views - The views to include in the email.
   * @param {boolean} includeEditorEmail - Whether to include the editor's email in the views table.
   * @returns {string} The formatted email content.
   */
  async generateEmailContent(views = [], includeEditorEmail = true) {
    let contactEmailDisplay = this.data.contactEmail
      ? this.data.contactEmail
      : "Anonymous";

    let content = `
      <h2>Issue Report Details</h2>
      <table>
        <tr>
          <td><strong>Type:</strong></td>
          <td>${capitalize(this.data.type)}</td>
        </tr>
        <tr>
          <td><strong>Priority:</strong></td>
          <td>${capitalize(this.data.priority)}</td>
        </tr>
        <tr>
          <td><strong>Subject:</strong></td>
          <td>${this.data.subject}</td>
        </tr>
        <tr>
          <td><strong>Description:</strong></td>
          <td>${this.data.description.replace(/\n/g, "<br>")}</td>
        </tr>
        <tr>
          <td><strong>Submitter:</strong></td>
          <td>${contactEmailDisplay}</td>
        </tr>
            `;

    if (this.project_id) {
      const project_link = this.projectLink(this.project_id);
      const project_title = await this.getProjectTitle(this.project_id);
      content =
        content +
        `<tr>
          <td><strong>Project:</strong></td>
          <td><a href=${project_link}>${project_title}</a></td>
        </tr>
    `;
    }

    if (this.data.includeMapConfig && this.data._context.map_config) {
      content += `
        <tr>
          <td><strong>Map Configuration:</strong></td>
          <td><pre>${formatJSON(this.data._context.map_config)}</pre></td>
        </tr>
      `;
    }

    if (views.length > 0) {
      let viewsContent = `<ul>`;

      for (const view of views) {
        viewsContent += `
          <li>
          <strong>ID view</strong>&nbsp;<span>${view.id}</span>
          <ul>
          <li><strong>Link</strong>&nbsp;<a href="${view.link}">${view.title}</a></li>
          <li><strong>Project</strong>&nbsp;<a href="${view.project_link}">${view.project_title}</a></li>
        `;

        if (includeEditorEmail) {
          viewsContent += `
            <li>
            <strong>Editor</strong>&nbsp;
            <a href="mailto:${view.editorEmail}">
            <span>${view.editorEmail}</span>
            </a>
            </li>`;
        }
        viewsContent += `
          </ul>
          </li>`;
      }
      viewsContent += "</ul>";
      content += `
        <tr>
          <td colspan="2"><strong>Views:</strong><br>${viewsContent}</td>
        </tr>
      `;
    }

    content += `
      </table>
    `;

    return content;
  }

  /**
   * Validates the email configuration and sends the email.
   * @param {Object} conf - The email configuration object.
   */
  async validateAndSendEmail(conf) {
    const validation = mailValidate(conf);
    if (!validation.ok) {
      throw new Error("Invalid email configuration");
    }

    await sendMailAuto(conf);
  }
}
