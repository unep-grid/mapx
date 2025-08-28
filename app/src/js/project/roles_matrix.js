import { el } from "../el/src/index.js";
import { modalSimple, modalConfirm } from "../mx_helper_modal.js";
import { ws } from "../mx.js";
import { settings } from "../settings";
import { bindAll } from "../bind_class_methods";
import { tt } from "../el_mapx";
import { isEmpty, isNotEmpty } from "../is_test/index.js";

/**
 * Role Matrix Manager
 * Handles project role management interface
 */
export class RoleMatrix {
  constructor(projectManager) {
    const rm = this;
    rm.pm = projectManager;
    rm.currentUserId = settings.user.id;
    rm.projectId = settings.project.id;
    rm.users = [];
    rm.changes = [];
    rm.modal = null;
    bindAll(rm);
  }

  /**
   * Show the role matrix modal
   */
  async show() {
    const rm = this;

    try {
      // Fetch current role data
      const data = await rm.fetchRoleData();

      if (data.error) {
        throw new Error(data.error);
      }

      rm.users = data.users || [];
      rm.currentUserId = data.currentUserId;

      // Build and show modal
      rm.buildModal();
    } catch (e) {
      console.error("Role matrix error:", e);
      await rm.showError(e.message || "Failed to load role matrix");
    }
  }

  /**
   * Fetch role data from server
   */
  async fetchRoleData() {
    return ws.emitAsync("/client/project/roles/get", {}, 30 * 1000);
  }

  /**
   * Build the role matrix modal
   */
  buildModal() {
    const rm = this;

    const elContent = rm.buildRoleTable();

    const elBtnSave = el(
      "button",
      {
        class: ["btn", "btn-primary"],
        on: {
          click: rm.handleSave,
        },
      },
      tt("btn_save"),
    );

    const elBtnCancel = el(
      "button",
      {
        class: ["btn", "btn-default"],
        on: {
          click: rm.handleCancel,
        },
      },
      tt("btn_cancel"),
    );

    rm.modal = modalSimple({
      title: tt("project_roles_matrix_title"),
      content: elContent,
      buttons: [elBtnSave, elBtnCancel],
      addBackground: true,
      style: {
        width: "80%",
        maxWidth: "900px",
      },
      removeCloseButton: true,
    });
  }

  /**
   * Build the role table with checkboxes
   */
  buildRoleTable() {
    const rm = this;

    if (isEmpty(rm.users)) {
      return el(
        "div",
        {
          class: "alert alert-info",
        },
        tt("project_roles_no_users"),
      );
    }

    const roles = ["contact", "admin", "publisher", "member"];

    // Table header
    const elHeaderRow = el("tr", [
      el("th", tt("email")),
      ...roles.map((role) =>
        el(
          "th",
          {
            class: "text-center",
          },
          tt(`project_role_${role}`),
        ),
      ),
    ]);

    // Table rows for each user
    const elRows = [];

    for (const user of rm.users) {
      const elCells = [
        el(
          "td",
          {
            class: "role-matrix-email",
          },
          user.email,
        ),
      ];

      for (const role of roles) {
        const isChecked = user[`is_${role}`];
        const isCurrentUser = user.id === rm.currentUserId;
        const isAdminRole = role === "admin";
        const shouldDisable = isCurrentUser && isAdminRole;

        const elCheckbox = el("input", {
          type: "checkbox",
          checked: isChecked,
          disabled: shouldDisable,
          dataset: {
            userId: user.id,
            role: role,
            originalValue: isChecked,
          },
          on: {
            change: rm.handleRoleChange,
          },
        });

        const elCell = el(
          "td",
          {
            class: ["text-center", "role-matrix-cell"],
          },
          elCheckbox,
        );

        if (shouldDisable) {
          elCell.classList.add("role-matrix-disabled");
        }

        elCells.push(elCell);
      }

      elRows.push(
        el(
          "tr",
          {
            dataset: {
              userId: user.id,
            },
          },
          elCells,
        ),
      );
    }

    const elTable = el(
      "table",
      {
        class: ["table", "table-striped", "role-matrix-table"],
      },
      [el("thead", elHeaderRow), el("tbody", elRows)],
    );

    const elContainer = el(
      "div",
      {
        class: "role-matrix-container",
      },
      [
        el(
          "div",
          {
            class: "role-matrix-info",
          },
          tt("project_roles_matrix_info"),
        ),
        elTable,
        el("div", {
          id: "role-matrix-validation",
          class: "role-matrix-validation",
        }),
      ],
    );

    return elContainer;
  }

  /**
   * Handle role checkbox change
   */
  handleRoleChange(event) {
    const rm = this;
    const checkbox = event.target;
    const userId = parseInt(checkbox.dataset.userId);
    const role = checkbox.dataset.role;
    const checked = checkbox.checked;

    // Apply automatic role inheritance first
    rm.applyRoleInheritance(userId, role, checked);

    // Validate and update UI
    rm.validateChanges();
  }

  /**
   * Apply automatic role inheritance
   */
  applyRoleInheritance(userId, changedRole, checked) {
    const rm = this;
    const hierarchy = ["member", "publisher", "admin", "contact"];
    const changedIndex = hierarchy.indexOf(changedRole);

    if (checked) {
      // When checking a role, auto-check all lower roles
      for (let i = 0; i <= changedIndex; i++) {
        rm.setRoleCheckbox(userId, hierarchy[i], true);
      }
    } else {
      // When unchecking a role, auto-uncheck all higher roles
      for (let i = changedIndex; i < hierarchy.length; i++) {
        rm.setRoleCheckbox(userId, hierarchy[i], false);
      }
    }
  }

  /**
   * Set checkbox state and track changes
   */
  setRoleCheckbox(userId, role, checked) {
    const rm = this;
    const checkbox = rm.findCheckbox(userId, role);

    if (!checkbox || checkbox.disabled) {
      return;
    }

    const originalValue = checkbox.dataset.originalValue === "true";
    checkbox.checked = checked;

    // Track change if different from original
    if (checked !== originalValue) {
      rm.addChange(userId, role, checked);
    } else {
      rm.removeChange(userId, role);
    }
  }

  /**
   * Find checkbox element for user/role
   */
  findCheckbox(userId, role) {
    return document.querySelector(
      `input[data-user-id="${userId}"][data-role="${role}"]`,
    );
  }

  /**
   * Add a role change to tracking
   */
  addChange(userId, role, checked) {
    const rm = this;

    // Remove existing change for this user/role
    rm.removeChange(userId, role);

    // Add new change
    rm.changes.push({
      userId: userId,
      role: role,
      checked: checked,
    });
  }

  /**
   * Remove a role change from tracking
   */
  removeChange(userId, role) {
    const rm = this;

    rm.changes = rm.changes.filter(
      (change) => !(change.userId === userId && change.role === role),
    );
  }

  /**
   * Validate current changes against business rules
   */
  validateChanges() {
    const rm = this;
    const elValidation = document.getElementById("role-matrix-validation");

    if (!elValidation) {
      return;
    }

    const issues = rm.getValidationIssues();

    if (isEmpty(issues)) {
      elValidation.innerHTML = "";
      elValidation.classList.remove("alert", "alert-danger");
      return;
    }

    const elIssues = issues.map((issue) => el("div", tt(issue)));

    elValidation.innerHTML = "";
    elValidation.classList.add("alert", "alert-danger");
    elValidation.appendChild(
      el("div", [el("strong", tt("validation_errors")), ...elIssues]),
    );
  }

  /**
   * Get validation issues for current state
   */
  getValidationIssues() {
    const rm = this;
    const issues = [];

    // Simulate final state after changes
    const finalState = rm.getFinalState();

    // Rule 1: Only 1 contact allowed
    const contactCount = finalState.contacts.length;
    if (contactCount > 1) {
      issues.push("project_roles_error_multiple_contacts");
    }

    // Rule 3: Role inheritance validation
    for (const userId of finalState.contacts) {
      if (
        !finalState.admins.includes(userId) ||
        !finalState.publishers.includes(userId) ||
        !finalState.members.includes(userId)
      ) {
        issues.push("project_roles_error_contact_inheritance");
        break;
      }
    }

    for (const userId of finalState.admins) {
      if (
        !finalState.publishers.includes(userId) ||
        !finalState.members.includes(userId)
      ) {
        issues.push("project_roles_error_admin_inheritance");
        break;
      }
    }

    for (const userId of finalState.publishers) {
      if (!finalState.members.includes(userId)) {
        issues.push("project_roles_error_publisher_inheritance");
        break;
      }
    }

    return issues;
  }

  /**
   * Get final state after applying all changes
   */
  getFinalState() {
    const rm = this;

    const state = {
      contacts: [],
      admins: [],
      publishers: [],
      members: [],
    };

    // Start with current state
    for (const user of rm.users) {
      if (user.is_contact) state.contacts.push(user.id);
      if (user.is_admin) state.admins.push(user.id);
      if (user.is_publisher) state.publishers.push(user.id);
      if (user.is_member) state.members.push(user.id);
    }

    // Apply changes
    for (const change of rm.changes) {
      const roleArray = state[change.role + "s"];
      const userIndex = roleArray.indexOf(change.userId);

      if (change.checked && userIndex === -1) {
        roleArray.push(change.userId);
      } else if (!change.checked && userIndex !== -1) {
        roleArray.splice(userIndex, 1);
      }
    }

    return state;
  }

  /**
   * Handle save button click
   */
  async handleSave() {
    const rm = this;

    try {
      if (isEmpty(rm.changes)) {
        throw new Error("No change");
      }

      // Validate before showing summary
      const issues = rm.getValidationIssues();
      if (isNotEmpty(issues)) {
        return; // Validation errors are already shown
      }

      // Show changes summary
      const confirmed = await rm.showChangesSummary();

      if (!confirmed) {
        return;
      }

      // Submit changes
      const result = await rm.submitChanges();

      if (result.error) {
        debugger;
        throw new Error(result.error);
      }

      // Show success and close
      await rm.showSuccess();
    } catch (e) {
      console.error("Save error:", e);
      await rm.showError(e.message || "Failed to save changes");
    }
  }

  /**
   * Show changes summary modal
   */
  async showChangesSummary() {
    const rm = this;

    const elSummary = await rm.buildChangesSummary();

    return modalConfirm({
      title: tt("project_roles_confirm_changes"),
      content: elSummary,
      confirm: tt("btn_confirm"),
      cancel: tt("btn_cancel"),
    });
  }

  /**
   * Build changes summary content
   */
  async buildChangesSummary() {
    const rm = this;

    const userMap = {};
    for (const user of rm.users) {
      userMap[user.id] = user;
    }

    const elChanges = [];

    for (const change of rm.changes) {
      const user = userMap[change.userId];
      const action = change.checked ? "added" : "removed";
      const elRole = tt(`project_role_${change.role}`);
      const elRoleAction = tt(`role_${action}`);

      const elChange = el(
        "li",
        {
          class: `role-change role-change-${action}`,
        },
        [
          el("strong", [
            elRole,
            el("span", " "),
            elRoleAction,
            el("span", ": "),
          ]),
          el("span", `${user.email} [${user.id}]`),
        ],
      );

      elChanges.push(elChange);
    }

    const ulChanges = el("ul", [...elChanges]);

    return el(
      "div",
      {
        class: "role-changes-summary",
      },
      [tt("project_roles_changes_summary"), ulChanges],
    );
  }

  /**
   * Submit changes to server
   */
  async submitChanges() {
    const rm = this;

    return ws.emitAsync(
      "/client/project/roles/update",
      {
        roleChanges: rm.changes,
      },
      30 * 1000,
    );
  }

  /**
   * Handle cancel button click
   */
  handleCancel() {
    const rm = this;
    rm.modal.close();
    rm.cleanup();
  }

  /**
   * Show success message
   */
  async showSuccess() {
    return modalConfirm({
      title: tt("success"),
      content: tt("project_roles_saved_successfully"),
      confirm: tt("btn_ok"),
      removeCloseButton: true,
    });
  }

  /**
   * Show error message
   */
  async showError(message) {
    return modalConfirm({
      title: tt("error"),
      content: message,
      confirm: tt("btn_ok"),
      removeCloseButton: true,
    });
  }

  /**
   * Cleanup when modal closes
   */
  cleanup() {
    const rm = this;
    rm.users = [];
    rm.changes = [];
    rm.modal = null;
  }
}
