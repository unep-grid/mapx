import { isAdmin } from "#mapx/authentication";
import { isEmpty, isNotEmpty, isArray } from "@fxi/mx_valid";
import { pgRead, pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";
import { sendMailAuto } from "#mapx/mail";
import { translate } from "#mapx/language";

/**
 * Get project roles matrix data with inheritance
 * Role hierarchy: contact > admin > publisher > member
 */
export async function ioProjectRolesGet(socket, data, cb) {
  try {
    const isUserAllowed = isAdmin(socket);
    if (!isUserAllowed) {
      throw new Error("project_roles_access_denied");
    }
    const idProject = socket.session.project_id;
    const currentUserId = socket.session.user_id;
    if (!idProject) {
      throw new Error("project_id_required");
    }

    // Get all users with their highest role
    const query = templates.getProjectRoleMatrix;

    const { rows } = await pgRead.query(query, [idProject]);

    data.users = rows;
    data.currentUserId = currentUserId;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * Update project roles matrix
 * Validates and applies role changes to the project
 */
export async function ioProjectRolesUpdate(socket, data, cb) {
  try {
    const isUserAllowed = isAdmin(socket);

    if (!isUserAllowed) {
      throw new Error("project_roles_access_denied");
    }

    const origin = socket.handshake.headers.origin;//https://app.mapx.org ...
    const idProject = socket.session.project_id;
    const currentUserId = socket.session.user_id;
    const { roleChanges } = data;
    const originProject =`${origin}?project=${idProject}`

    if (!idProject) {
      throw new Error("project_id_required");
    }

    if (isEmpty(roleChanges) || !isArray(roleChanges)) {
      throw new Error("role_changes_required");
    }

    // Validate role changes
    const validation = await validateRoleChanges(
      roleChanges,
      idProject,
      currentUserId,
    );

    if (!validation.valid) {
      throw new Error(validation.error || "role_changes_invalid");
    }

    // Apply changes to database
    const changes = await updateProjectRoles(idProject, roleChanges);

    // Prepare notification data (for future email implementation)
    await reportRolesChange(changes, idProject, currentUserId, originProject);

    data.changes = changes;
    data.success = true;
  } catch (e) {
    data.error = e?.message || e;
  } finally {
    cb(data);
  }
}

/**
 * Validate role changes against business rules
 */
async function validateRoleChanges(roleChanges, idProject, currentUserId) {
  try {
    // Get current project state
    const { rows } = await pgRead.query(
      `SELECT contacts, admins, publishers, members FROM mx_projects WHERE id = $1`,
      [idProject],
    );

    if (isEmpty(rows)) {
      return { valid: false, error: "project_not_found" };
    }

    const currentRoles = rows[0];
    const newRoles = {
      contacts: [...(currentRoles.contacts || [])],
      admins: [...(currentRoles.admins || [])],
      publishers: [...(currentRoles.publishers || [])],
      members: [...(currentRoles.members || [])],
    };

    let contactCount = currentRoles.contacts?.length || 0;

    for (const change of roleChanges) {
      const { userId, role, checked } = change;

      if (!userId || !role) {
        return { valid: false, error: "invalid_role_change_format" };
      }

      // Rule 4: Admin can't un-admin themselves
      if (userId === currentUserId && role === "admin" && !checked) {
        return {
          valid: false,
          error: "cannot_remove_own_admin_role",
        };
      }

      // Apply change to temporary state
      const roleArray = newRoles[role + "s"]; // contacts, admins, publishers, members
      if (!roleArray) {
        return { valid: false, error: "invalid_role_type" };
      }

      const userIndex = roleArray.indexOf(userId);

      if (checked && userIndex === -1) {
        roleArray.push(userId);
        if (role === "contact") contactCount++;
      } else if (!checked && userIndex !== -1) {
        roleArray.splice(userIndex, 1);
        if (role === "contact") contactCount--;
      }
    }

    // Rule 1: Only 1 contact allowed
    if (contactCount > 1) {
      return {
        valid: false,
        error: "only_one_contact_allowed",
      };
    }

    // Rule 3: Role inheritance validation
    for (const userId of newRoles.contacts) {
      if (
        !newRoles.admins.includes(userId) ||
        !newRoles.publishers.includes(userId) ||
        !newRoles.members.includes(userId)
      ) {
        return {
          valid: false,
          error: "contact_must_have_all_roles",
        };
      }
    }

    for (const userId of newRoles.admins) {
      if (
        !newRoles.publishers.includes(userId) ||
        !newRoles.members.includes(userId)
      ) {
        return {
          valid: false,
          error: "admin_must_have_publisher_and_member_roles",
        };
      }
    }

    for (const userId of newRoles.publishers) {
      if (!newRoles.members.includes(userId)) {
        return {
          valid: false,
          error: "publisher_must_have_member_role",
        };
      }
    }

    return { valid: true, newRoles };
  } catch (e) {
    return { valid: false, error: e?.message || e };
  }
}

/**
 * Update project roles in database
 */
async function updateProjectRoles(idProject, roleChanges) {
  const client = await pgWrite.connect();

  try {
    await client.query("BEGIN");

    // Get current state
    const { rows } = await client.query(
      `SELECT contacts, admins, publishers, members FROM mx_projects WHERE id = $1`,
      [idProject],
    );

    const currentRoles = rows[0];
    const newRoles = {
      contacts: [...(currentRoles.contacts || [])],
      admins: [...(currentRoles.admins || [])],
      publishers: [...(currentRoles.publishers || [])],
      members: [...(currentRoles.members || [])],
    };

    const changes = {
      added: { contacts: [], admins: [], publishers: [], members: [] },
      removed: { contacts: [], admins: [], publishers: [], members: [] },
    };

    // Apply changes and track them
    for (const change of roleChanges) {
      const { userId, role, checked } = change;
      const roleArray = newRoles[role + "s"];
      const userIndex = roleArray.indexOf(userId);

      if (checked && userIndex === -1) {
        roleArray.push(userId);
        changes.added[role + "s"].push(userId);
      } else if (!checked && userIndex !== -1) {
        roleArray.splice(userIndex, 1);
        changes.removed[role + "s"].push(userId);
      }
    }

    // Update database
    await client.query(
      `UPDATE mx_projects SET
        contacts = $1,
        admins = $2,
        publishers = $3,
        members = $4,
        date_modified = NOW()
      WHERE id = $5`,
      [
        JSON.stringify(newRoles.contacts),
        JSON.stringify(newRoles.admins),
        JSON.stringify(newRoles.publishers),
        JSON.stringify(newRoles.members),
        idProject,
      ],
    );

    await client.query("COMMIT");
    return changes;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Report role changes for future email notifications
 */
async function reportRolesChange(changes, idProject, currentUserId, originProject) {
  try {
    const allUserIds = [
      ...changes.added.contacts,
      ...changes.added.admins,
      ...changes.added.publishers,
      ...changes.added.members,
      ...changes.removed.contacts,
      ...changes.removed.admins,
      ...changes.removed.publishers,
      ...changes.removed.members,
    ];

    if (isEmpty(allUserIds)) {
      return;
    }

    const uniqueUserIds = [...new Set(allUserIds)];

    // Get project details and user details in parallel
    const [projectResult, usersResult] = await Promise.all([
      pgRead.query(`SELECT title FROM mx_projects WHERE id = $1`, [idProject]),
      pgRead.query(
        `SELECT id,
        email,
        data #>> '{user,cache,last_language}' as language
        FROM mx_users
        WHERE id = ANY($1)`,
        [uniqueUserIds.concat(currentUserId)],
      ),
    ]);

    if (isEmpty(projectResult.rows)) {
      console.error("Project not found for notifications:", idProject);
      return;
    }
    const projectTitle = projectResult.rows[0].title;

    const users = {};
    for (const user of usersResult.rows) {
      users[user.id] = { email: user.email, language: user.language || "en" };
    }

    // Group changes by user
    const userChanges = {};
    for (const userId of uniqueUserIds) {
      userChanges[userId] = { added: [], removed: [] };
    }

    for (const [role, userIds] of Object.entries(changes.added)) {
      for (const userId of userIds) {
        if (userChanges[userId])
          userChanges[userId].added.push(role.slice(0, -1));
      }
    }
    for (const [role, userIds] of Object.entries(changes.removed)) {
      for (const userId of userIds) {
        if (userChanges[userId])
          userChanges[userId].removed.push(role.slice(0, -1));
      }
    }

    // Send emails to affected users
    for (const [userId, change] of Object.entries(userChanges)) {
      const user = users[userId];
      if (!user) continue;

      const lang = user.language;
      const nameProject = projectTitle[lang] || projectTitle.en || idProject;

      let roleChangesList = '<ul style="list-style-type: none; padding-left: 0;">';
      if (isNotEmpty(change.added)) {
        const addedRoles = change.added.map(role => translate(`project_role_${role}`, lang)).join(', ');
        roleChangesList += `<li style="margin: 5px 0;"><span style="color: #28a745;">✓ ${translate('role_added', lang)}:</span> ${addedRoles}</li>`;
      }
      if (isNotEmpty(change.removed)) {
        const removedRoles = change.removed.map(role => translate(`project_role_${role}`, lang)).join(', ');
        roleChangesList += `<li style="margin: 5px 0;"><span style="color: #dc3545;">✗ ${translate('role_removed', lang)}:</span> ${removedRoles}</li>`;
      }
      roleChangesList += '</ul>';

      if (isEmpty(change.added) && isEmpty(change.removed)) continue;

      const mailOptions = {
        to: user.email,
        subject: translate("project_roles_updated_mail_subject", lang, {
          nameProject,
        }),
        title: translate("project_roles_updated_mail_title", lang),
        content: translate("project_roles_updated_mail_content", lang, {
          projectUrl: originProject,
          projectName: nameProject,
          roleChangesList,
        }),
      };
      sendMailAuto(mailOptions);
    }

    // Send summary email to all project admins
    const { rows: adminRows } = await pgRead.query(
      `SELECT admins FROM mx_projects WHERE id = $1`,
      [idProject],
    );
    if (isNotEmpty(adminRows) && isNotEmpty(adminRows[0].admins)) {
      const adminIds = adminRows[0].admins;
      const { rows: adminUsers } = await pgRead.query(
        `SELECT id, email, data #>> '{user,cache,last_language}' as language FROM mx_users WHERE id = ANY($1)`,
        [adminIds],
      );

      for (const admin of adminUsers) {
        const lang = admin.language || "en";
        let changesSummary = '<ul style="list-style-type: none; padding-left: 0;">';
        for (const [userId, change] of Object.entries(userChanges)) {
          const user = users[userId];
          if (!user) continue;
          changesSummary += `<li style="margin-bottom: 10px;"><strong>User:</strong> ${user.email}`;
          changesSummary += '<ul style="list-style-type: none; padding-left: 15px;">';
          if (isNotEmpty(change.added)) {
            changesSummary += `<li style="margin: 5px 0;"><span style="color: #28a745;">✓ ${translate('role_added', lang)}:</span> ${change.added.join(', ')}</li>`;
          }
          if (isNotEmpty(change.removed)) {
            changesSummary += `<li style="margin: 5px 0;"><span style="color: #dc3545;">✗ ${translate('role_removed', lang)}:</span> ${change.removed.join(', ')}</li>`;
          }
          changesSummary += '</ul></li>';
        }
        changesSummary += '</ul>';

        if (Object.values(userChanges).every(c => isEmpty(c.added) && isEmpty(c.removed))) return;

        const nameProject =
          projectTitle[lang] || projectTitle.en || idProject;
        const subject =
          translate("project_roles_updated_mail_subject", lang, {
            nameProject,
          }) + (admin.id === currentUserId ? " (by you)" : "");

        const mailOptions = {
          to: admin.email,
          subject: subject,
          title: translate("project_roles_updated_mail_title", lang),
          content: translate(
            "project_roles_updated_mail_content_admin_summary",
            lang,
            {
              projectUrl: originProject,
              projectName: nameProject,
              changesSummary,
            },
          ),
        };
        sendMailAuto(mailOptions);
      }
    }
  } catch (e) {
    console.error("Error preparing role change notifications:", e);
  }
}
