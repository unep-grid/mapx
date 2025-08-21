import { isAdmin } from "#mapx/authentication";
import { isEmpty, isNotEmpty, isArray } from "@fxi/mx_valid";
import { pgRead, pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";

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

    const idProject = socket.session.project_id;
    const currentUserId = socket.session.user_id;
    const { roleChanges } = data;

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
    await reportRolesChange(changes, idProject, currentUserId);

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
 * TODO: Implement email sending in future version
 */
async function reportRolesChange(changes, idProject, currentUserId) {
  try {
    // Get user emails for the changes
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

    const { rows } = await pgRead.query(
      `SELECT id, email, data #>> '{user,cache,last_language}' as language FROM mx_users WHERE id = ANY($1)`,
      [uniqueUserIds],
    );

    const userEmails = {};
    for (const user of rows) {
      userEmails[user.id] = user.email;
    }

    // Prepare notification data structure
    const notificationData = {
      projectId: idProject,
      changedBy: currentUserId,
      timestamp: new Date().toISOString(),
      changes: {
        added: {},
        removed: {},
      },
    };

    // Format changes with email addresses
    for (const [role, userIds] of Object.entries(changes.added)) {
      if (isNotEmpty(userIds)) {
        notificationData.changes.added[role] = userIds.map((id) => ({
          id,
          email: userEmails[id],
        }));
      }
    }

    for (const [role, userIds] of Object.entries(changes.removed)) {
      if (isNotEmpty(userIds)) {
        notificationData.changes.removed[role] = userIds.map((id) => ({
          id,
          email: userEmails[id],
        }));
      }
    }

    debugger; 
    // TODO: Send emails to admins and affected users
    console.log("Role changes to be notified:", notificationData);

    return notificationData;
  } catch (e) {
    console.error("Error preparing role change notifications:", e);
  }
}
