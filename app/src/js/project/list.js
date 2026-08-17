import { requestProjectMembership, setProject } from "../map_helpers/index.js";
import { getDictItem } from "../language";
import { settings } from "../settings";
import { ws } from "../mx.js";
import { ElementCreator } from "../el/src/index.js";
import {
  PROJECT_LIST_CHUNK_SIZE,
  PROJECT_LIST_INITIAL_SIZE,
  PROJECT_THEMES,
  nextProjectRenderLimit,
  normalizeProject,
  selectProjects,
} from "./list_helpers.js";

export {
  PROJECT_LIST_CHUNK_SIZE,
  PROJECT_LIST_INITIAL_SIZE,
  PROJECT_THEMES,
} from "./list_helpers.js";

const UI_KEYS = [
  "project_search_values",
  "project_list_search_tools",
  "project_list_filters_active",
  "project_list_all_accessible",
  "project_list_my_projects",
  "project_list_all_roles",
  "project_list_all_themes",
  "project_list_sort_default",
  "project_list_sort_default_desc",
  "project_list_sort_created_desc",
  "project_list_sort_created_desc_desc",
  "project_list_sort_created_asc",
  "project_list_sort_created_asc_desc",
  "project_list_sort_name_asc",
  "project_list_sort_name_desc",
  "project_list_sort_views_desc",
  "project_list_sort_views_asc",
  "project_list_sort_collaborators_desc",
  "project_list_sort_collaborators_asc",
  "project_list_clear",
  "project_list_clear_desc",
  "project_list_role",
  "project_list_views",
  "project_list_collaborators",
  "project_list_results",
  "project_list_showing",
  "project_list_of",
  "project_list_loading",
  "project_list_error",
  "project_list_empty",
  "project_favorite_add",
  "project_favorite_remove",
  "project_favorite_error",
  "project_featured",
  "project_featured_actions",
  "project_featured_add",
  "project_featured_remove",
  "project_featured_rank",
  "project_featured_save_rank",
  "project_featured_error",
  "project_legacy",
  "project_legacy_add",
  "project_legacy_remove",
  "project_legacy_error",
  "project_delete_action",
  "btn_join_project",
  "admin",
  "publisher",
  "member",
  "public",
  ...PROJECT_THEMES.map((theme) => `project_theme_${theme}`),
];

const DEFAULT_STATE = {
  scope: "accessible",
  role: "any",
  themes: [],
  sort: "default",
  search: "",
};

const ROLE_INITIALS = {
  admin: "A",
  member: "M",
  publisher: "P",
};

const SORT_OPTIONS = [
  ["default", "project_list_sort_default"],
  ["created_desc", "project_list_sort_created_desc"],
  ["created_asc", "project_list_sort_created_asc"],
  ["name_asc", "project_list_sort_name_asc"],
  ["name_desc", "project_list_sort_name_desc"],
  ["views_desc", "project_list_sort_views_desc"],
  ["views_asc", "project_list_sort_views_asc"],
  ["collaborators_desc", "project_list_sort_collaborators_desc"],
  ["collaborators_asc", "project_list_sort_collaborators_asc"],
];

function iconButton(el, className, iconClass, label, action) {
  return el(
    "button",
    {
      class: className,
      type: "button",
      dataset: { action },
      "aria-label": label,
      title: label,
    },
    el("i", { class: iconClass, "aria-hidden": "true" }),
  );
}

export class ProjectListElement extends HTMLElement {
  constructor() {
    super();
    this.projects = [];
    this.logos = new Map();
    this.pendingLogos = new Set();
    this.avatarElements = new Map();
    this.state = { ...DEFAULT_STATE, themes: [] };
    this.renderLimit = PROJECT_LIST_INITIAL_SIZE;
    this.labels = {};
    this.themeLabels = {};
    this.canCurateFeatured = false;
    this.canCurateLegacy = false;
    this.pendingProjects = new Set();
    this.curatorTriggers = new Map();
    this.curatorControls = [];
    this._onClick = this.onClick.bind(this);
    this._onChange = this.onChange.bind(this);
    this._onInput = this.onInput.bind(this);
    this._onKeydown = this.onKeydown.bind(this);
    this._onScroll = this.onScroll.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);
    this._onOutsidePointerDown = this.onOutsidePointerDown.bind(this);
  }

  get el() {
    if (this.elementCreator?.document !== this.ownerDocument) {
      this.elementCreator = new ElementCreator({
        document: this.ownerDocument,
      });
    }
    return this.elementCreator.el;
  }

  connectedCallback() {
    if (this._connected) return;
    this._connected = true;
    this.classList.add("mx-project-browser");
    this.addEventListener("click", this._onClick);
    this.addEventListener("change", this._onChange);
    this.addEventListener("input", this._onInput);
    this.addEventListener("keydown", this._onKeydown);
    this.addEventListener("contextmenu", this._onContextMenu);
    this.ownerDocument.addEventListener(
      "pointerdown",
      this._onOutsidePointerDown,
      true,
    );
    this.init();
  }

  disconnectedCallback() {
    this.removeEventListener("click", this._onClick);
    this.removeEventListener("change", this._onChange);
    this.removeEventListener("input", this._onInput);
    this.removeEventListener("keydown", this._onKeydown);
    this.removeEventListener("contextmenu", this._onContextMenu);
    this.ownerDocument.removeEventListener(
      "pointerdown",
      this._onOutsidePointerDown,
      true,
    );
    this.results?.removeEventListener("scroll", this._onScroll);
    this._intersectionObserver?.disconnect();
    clearTimeout(this._searchTimer);
    this._connected = false;
  }

  /**
   * @param {Object} [options]
   * @param {string} [options.language]
   * @param {Object} [options.initialFilters]
   * @param {(projectId: string) => void} [options.onProjectRequested]
   * @param {(projectId: string) => void} [options.onProjectLoaded]
   * @param {(projectId: string, projectTitle: string) => Promise<boolean>} [options.onDeleteRequested]
   */
  configure(options = {}) {
    this.options = options;
    const initial = options.initialFilters || {};
    this.state = {
      ...this.state,
      ...initial,
      themes: Array.isArray(initial.themes) ? initial.themes : [],
    };
    if (settings.user.guest === true) {
      this.state.scope = "accessible";
      this.state.role = "any";
    }
  }

  async init() {
    await this.loadLabels();
    if (!this._connected) return;
    this.buildShell();
    await this.loadProjects();
  }

  async loadLabels() {
    const values = await getDictItem(UI_KEYS, this.options?.language);
    this.labels = Object.fromEntries(
      UI_KEYS.map((key, index) => [key, values[index]]),
    );
    this.themeLabels = Object.fromEntries(
      PROJECT_THEMES.map((theme) => [
        theme,
        this.labels[`project_theme_${theme}`],
      ]),
    );
  }

  label(key) {
    return this.labels[key] || key;
  }

  buildShell() {
    this.replaceChildren();
    const controls = this.el("div", { class: "mx-project-browser-controls" });
    const searchWrap = this.el("label", {
      class: "mx-project-browser-search-wrap",
    });
    const searchIcon = this.el("i", {
      class: "fa fa-search",
      "aria-hidden": "true",
    });
    this.searchInput = this.el("input", {
      class: "form-control mx-project-browser-search",
    });
    this.searchInput.type = "search";
    this.searchInput.value = this.state.search;
    this.searchInput.placeholder = this.label("project_search_values");
    this.searchInput.setAttribute(
      "aria-label",
      this.label("project_search_values"),
    );
    searchWrap.append(searchIcon, this.searchInput);

    this.toolsButton = iconButton(
      this.el,
      "btn btn-circle btn-circle-medium mx-project-browser-tools-button",
      "fa fa-sliders",
      this.label("project_list_search_tools"),
      "toggle-tools",
    );
    this.toolsButton.setAttribute("aria-expanded", "false");
    this.toolsButton.setAttribute("aria-haspopup", "dialog");
    this.toolsButton.setAttribute("aria-controls", "mx-project-browser-tools");

    this.toolsPopover = this.el("div", {
      class: "mx-project-browser-tools-popover",
    });
    this.toolsPopover.id = "mx-project-browser-tools";
    this.toolsPopover.hidden = true;
    this.toolsPopover.setAttribute("role", "dialog");
    this.toolsPopover.setAttribute(
      "aria-label",
      this.label("project_list_search_tools"),
    );
    controls.append(searchWrap, this.toolsButton, this.toolsPopover);

    this.results = this.el("div", { class: "mx-project-browser-results" });
    this.results.setAttribute("role", "list");
    this.results.setAttribute("aria-busy", "true");
    this.rows = this.el("div", { class: "mx-project-browser-rows" });
    this.message = this.el(
      "div",
      { class: "mx-project-browser-message" },
      this.label("project_list_loading"),
    );
    this.message.setAttribute("aria-live", "polite");
    this.sentinel = this.el("div", { class: "mx-project-browser-sentinel" });
    this.sentinel.setAttribute("aria-hidden", "true");
    this.results.append(this.rows, this.message, this.sentinel);

    this.curatorPopover = this.el("div", {
      class: "mx-project-browser-curator-popover",
    });
    this.curatorPopover.hidden = true;
    this.curatorPopover.setAttribute("role", "menu");
    this.curatorPopover.setAttribute(
      "aria-label",
      this.label("project_featured_actions"),
    );

    const footer = this.el("div", { class: "mx-project-browser-footer" });
    this.counter = this.el("span", { class: "mx-project-browser-counter" });
    this.counter.setAttribute("aria-live", "polite");
    footer.appendChild(this.counter);
    this.append(controls, this.results, this.curatorPopover, footer);
    this.results.addEventListener("scroll", this._onScroll, { passive: true });
    this.setupIntersectionObserver();
    this.buildTools();
  }

  buildSelect(filter, labelKey, options, value) {
    const select = this.el("select", {
      class: "form-control",
      dataset: { filter },
      "aria-label": this.label(labelKey),
    });
    for (const [optionValue, optionLabel] of options) {
      const option = this.el("option", this.label(optionLabel));
      option.value = optionValue;
      select.appendChild(option);
    }
    select.value = value;
    return select;
  }

  buildTools() {
    this.toolsPopover.replaceChildren();
    const scopes = this.el("div", {
      class: "btn-group mx-project-browser-scopes",
    });
    scopes.hidden = settings.user.guest === true;
    scopes.setAttribute("role", "group");
    scopes.setAttribute(
      "aria-label",
      this.label("project_list_all_accessible"),
    );
    this.scopeButtons = [];
    for (const [scope, key] of [
      ["accessible", "project_list_all_accessible"],
      ["mine", "project_list_my_projects"],
    ]) {
      const button = this.el(
        "button",
        {
          class: "btn btn-default",
          type: "button",
          dataset: { scope },
        },
        this.label(key),
      );
      this.scopeButtons.push(button);
      scopes.appendChild(button);
    }

    const availableRoles = [
      ...new Set(
        this.projects
          .map((project) => project.role)
          .filter((role) => role !== "public"),
      ),
    ];
    if (
      ["admin", "publisher", "member"].includes(this.state.role) &&
      !availableRoles.includes(this.state.role)
    ) {
      availableRoles.push(this.state.role);
    }
    this.roleSelect = this.buildSelect(
      "role",
      "project_list_role",
      [
        ["any", "project_list_all_roles"],
        ...["admin", "publisher", "member"]
          .filter((role) => availableRoles.includes(role))
          .map((role) => [role, role]),
      ],
      this.state.role,
    );
    const roleWrap = this.wrapTool(this.roleSelect);
    roleWrap.hidden =
      settings.user.guest === true || availableRoles.length <= 1;

    const availableThemes = [
      ...new Set(this.projects.flatMap((project) => project.themes)),
    ];
    for (const theme of this.state.themes) {
      if (PROJECT_THEMES.includes(theme) && !availableThemes.includes(theme)) {
        availableThemes.push(theme);
      }
    }
    availableThemes.sort((a, b) =>
      (this.themeLabels[a] || a).localeCompare(this.themeLabels[b] || b),
    );
    this.themeSelect = this.buildSelect(
      "theme",
      "project_list_all_themes",
      [
        ["", "project_list_all_themes"],
        ...availableThemes.map((theme) => [theme, `project_theme_${theme}`]),
      ],
      this.state.themes[0] || "",
    );
    const themeWrap = this.wrapTool(this.themeSelect);
    themeWrap.hidden = availableThemes.length <= 1;

    this.sortSelect = this.buildSelect(
      "sort",
      "project_list_sort_created_desc",
      SORT_OPTIONS,
      this.state.sort,
    );
    this.updateSortDescription();
    this.clearButton = this.el(
      "button",
      {
        class: "btn btn-link mx-project-browser-clear",
        type: "button",
        dataset: { action: "clear" },
      },
      this.label("project_list_clear"),
    );
    this.clearButton.title = this.label("project_list_clear_desc");
    this.toolsPopover.append(
      scopes,
      roleWrap,
      themeWrap,
      this.wrapTool(this.sortSelect),
      this.clearButton,
    );
    this.updateControls();
  }

  wrapTool(control) {
    const wrapper = this.el("div", { class: "mx-project-browser-tool" });
    wrapper.appendChild(control);
    return wrapper;
  }

  setupIntersectionObserver() {
    if (typeof IntersectionObserver !== "function") return;
    this._intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this.loadMore();
      },
      { root: this.results, rootMargin: "160px 0px" },
    );
    this._intersectionObserver.observe(this.sentinel);
  }

  async loadProjects() {
    try {
      const response = await ws.emitAsync(
        "/client/project/list",
        { language: this.options?.language || settings.language },
        30 * 1000,
      );
      if (response?.error) throw new Error(response.error);
      this.projects = (response?.projects || [])
        .map((project) => normalizeProject(project, this.themeLabels))
        .filter((project) => project.id !== settings.project.id);
      this.canCurateFeatured = response?.can_curate_featured === true;
      this.canCurateLegacy = response?.can_curate_legacy === true;
      this.buildTools();
      this.results.setAttribute("aria-busy", "false");
      this.renderResults();
    } catch (error) {
      console.error("Project list error", error);
      this.results?.setAttribute("aria-busy", "false");
      this.showError("project_list_error");
    }
  }

  get selectedProjects() {
    return selectProjects(this.projects, this.state, this.themeLabels);
  }

  renderResults({ resetScroll = false } = {}) {
    const projects = this.selectedProjects;
    const visibleProjects = projects.slice(0, this.renderLimit);
    this.closeCuratorMenu();
    this.avatarElements.clear();
    this.curatorTriggers.clear();
    this.rows.replaceChildren(
      ...visibleProjects.map((project) => this.buildRow(project)),
    );
    const isEmpty = projects.length === 0;
    this.message.hidden = !isEmpty;
    this.message.classList.remove("text-danger");
    this.message.textContent = isEmpty ? this.label("project_list_empty") : "";
    this.sentinel.hidden = visibleProjects.length >= projects.length;
    this.counter.textContent = `${this.label("project_list_showing")} ${
      visibleProjects.length
    } ${this.label("project_list_of")} ${projects.length} ${this.label(
      "project_list_results",
    )}`;
    this.updateControls();
    if (resetScroll) this.results.scrollTop = 0;
    this.loadLogos(visibleProjects);
  }

  buildRow(project) {
    const row = this.el("div", {
      class: "mx-project-browser-row",
      dataset: { projectId: project.id, action: "open" },
      tabindex: "0",
      role: "listitem",
    });

    const avatar = this.el(
      "span",
      {
        class: "mx-project-browser-avatar",
        dataset: { logoFor: project.id },
      },
      project.title.slice(0, 1).toUpperCase(),
    );
    avatar.dataset.tone = String(
      [...project.id].reduce((sum, character) => {
        return sum + character.charCodeAt(0);
      }, 0) % 4,
    );
    this.avatarElements.set(project.id, avatar);
    if (this.logos.has(project.id)) {
      this.setLogo(avatar, this.logos.get(project.id), project.title);
    }
    const avatarWrap = this.el("span", {
      class: "mx-project-browser-avatar-wrap",
    });
    avatarWrap.appendChild(avatar);
    if (project.role !== "public") {
      const roleLabel = this.label(project.role);
      avatarWrap.appendChild(
        this.el(
          "span",
          {
            class: `mx-project-role mx-project-role-${project.role}`,
            title: roleLabel,
            "aria-label": `${this.label("project_list_role")}: ${roleLabel}`,
          },
          this.el("i", {
            class: "mx-icon mx-shield mx-project-role-shield",
            "aria-hidden": "true",
          }),
          this.el(
            "span",
            { class: "mx-project-role-initial", "aria-hidden": "true" },
            ROLE_INITIALS[project.role],
          ),
        ),
      );
    }

    const text = this.el("div", { class: "mx-project-browser-text" });
    const heading = this.el("div", { class: "mx-project-browser-heading" });
    heading.append(
      this.el("strong", { class: "mx-project-browser-title" }, project.title),
    );
    if (this.canCurateFeatured) {
      const featuredLabel = this.label("project_featured_actions");
      const featured = iconButton(
        this.el,
        "mx-project-browser-heading-action mx-project-browser-featured",
        project.featured_rank === null ? "fa fa-bookmark-o" : "fa fa-bookmark",
        featuredLabel,
        "curator-menu",
      );
      featured.dataset.projectId = project.id;
      featured.setAttribute("aria-haspopup", "menu");
      featured.setAttribute("aria-expanded", "false");
      featured.disabled = this.pendingProjects.has(project.id);
      this.curatorTriggers.set(project.id, featured);
      heading.appendChild(featured);
    } else if (project.featured_rank !== null) {
      heading.appendChild(
        this.el(
          "span",
          {
            class: "mx-project-browser-featured",
            title: this.label("project_featured"),
            "aria-label": this.label("project_featured"),
          },
          this.el("i", {
            class: "fa fa-bookmark",
            "aria-hidden": "true",
          }),
        ),
      );
    }
    if (this.canCurateLegacy) {
      const legacyLabel = this.label(
        project.legacy ? "project_legacy_remove" : "project_legacy_add",
      );
      const legacy = iconButton(
        this.el,
        "mx-project-browser-heading-action mx-project-browser-legacy",
        project.legacy
          ? "mx-icon mx-archive-box-closed"
          : "mx-icon mx-archive-box",
        legacyLabel,
        "legacy",
      );
      legacy.dataset.projectId = project.id;
      legacy.setAttribute("aria-pressed", String(project.legacy));
      legacy.disabled = this.pendingProjects.has(project.id);
      heading.appendChild(legacy);
    } else if (project.legacy) {
      heading.appendChild(
        this.el(
          "span",
          {
            class: "mx-project-browser-legacy",
            title: this.label("project_legacy"),
            "aria-label": this.label("project_legacy"),
          },
          this.el("i", {
            class: "mx-icon mx-archive-box-closed",
            "aria-hidden": "true",
          }),
        ),
      );
    }
    if (this.canCurateLegacy && project.legacy) {
      const deleteLabel = this.label("project_delete_action");
      const deleteButton = iconButton(
        this.el,
        "mx-project-browser-heading-action mx-project-browser-delete",
        "fa fa-trash",
        deleteLabel,
        "delete",
      );
      deleteButton.dataset.projectId = project.id;
      deleteButton.disabled = this.pendingProjects.has(project.id);
      heading.appendChild(deleteButton);
    }
    if (settings.user.guest !== true) {
      const favoriteLabel = this.label(
        project.is_favorite
          ? "project_favorite_remove"
          : "project_favorite_add",
      );
      const favorite = iconButton(
        this.el,
        "mx-project-browser-heading-action mx-project-browser-favorite",
        project.is_favorite ? "fa fa-star" : "fa fa-star-o",
        favoriteLabel,
        "favorite",
      );
      favorite.dataset.projectId = project.id;
      favorite.setAttribute("aria-pressed", String(project.is_favorite));
      favorite.disabled = this.pendingProjects.has(project.id);
      heading.appendChild(favorite);
    }
    if (
      project.role === "public" &&
      project.allow_join === true &&
      settings.user.guest !== true
    ) {
      const join = iconButton(
        this.el,
        "mx-project-browser-heading-action mx-project-browser-join",
        "fa fa-sign-in",
        this.label("btn_join_project"),
        "join",
      );
      join.dataset.projectId = project.id;
      heading.appendChild(join);
    }
    const stats = this.el("span", { class: "mx-project-browser-stats" });
    stats.append(
      this.buildStat(
        "mx-icon mx-view",
        project.view_count,
        "project_list_views",
      ),
      this.buildStat(
        "fa fa-users",
        project.collaborator_count,
        "project_list_collaborators",
      ),
    );
    heading.appendChild(stats);
    text.appendChild(heading);
    if (project.description) {
      text.appendChild(
        this.el(
          "span",
          { class: "mx-project-browser-description" },
          project.description,
        ),
      );
    }
    const meta = this.el("span", { class: "mx-project-browser-meta" });
    if (project.org_name) {
      meta.appendChild(
        this.el(
          "span",
          { class: "mx-project-browser-organisation" },
          project.org_name,
        ),
      );
    }
    for (const theme of project.themes.slice(0, 2)) {
      meta.appendChild(
        this.el(
          "span",
          { class: "mx-project-browser-theme" },
          this.themeLabels[theme] || theme,
        ),
      );
    }
    if (meta.childElementCount > 0) text.appendChild(meta);

    const actions = this.el("span", { class: "mx-project-browser-actions" });
    const chevron = this.el("i", {
      class: "fa fa-chevron-right mx-project-browser-open",
      "aria-hidden": "true",
    });
    actions.appendChild(chevron);
    row.append(avatarWrap, text, actions);
    return row;
  }

  updateSortDescription() {
    if (!this.sortSelect) return;
    const descriptionKey = {
      default: "project_list_sort_default_desc",
      created_desc: "project_list_sort_created_desc_desc",
      created_asc: "project_list_sort_created_asc_desc",
    }[this.state.sort];
    const description = descriptionKey ? this.label(descriptionKey) : "";
    this.sortSelect.title = description;
  }

  buildStat(iconClasses, value, labelKey) {
    const label = `${this.label(labelKey)}: ${value}`;
    return this.el(
      "span",
      {
        class: "mx-project-browser-stat",
        "aria-label": label,
        title: label,
      },
      this.el("i", { class: iconClasses, "aria-hidden": "true" }),
      this.el(
        "span",
        { class: "mx-project-browser-stat-value" },
        String(value),
      ),
    );
  }

  updateControls() {
    for (const button of this.scopeButtons || []) {
      const active = button.dataset.scope === this.state.scope;
      button.classList.toggle("btn-primary", active);
      button.classList.toggle("btn-default", !active);
      button.setAttribute("aria-pressed", String(active));
    }
    if (this.clearButton) {
      const isDefault = this.filtersAreDefault();
      this.clearButton.hidden = isDefault && !this.state.search;
      this.toolsButton.classList.toggle(
        "mx-project-browser-tools-active",
        !isDefault,
      );
      const label = !isDefault
        ? `${this.label("project_list_search_tools")}: ${this.label(
            "project_list_filters_active",
          )}`
        : this.label("project_list_search_tools");
      this.toolsButton.setAttribute("aria-label", label);
      this.toolsButton.title = label;
    }
  }

  filtersAreDefault() {
    return (
      this.state.scope === DEFAULT_STATE.scope &&
      this.state.role === DEFAULT_STATE.role &&
      this.state.sort === DEFAULT_STATE.sort &&
      this.state.themes.length === 0
    );
  }

  toggleTools(force) {
    const open =
      typeof force === "boolean" ? force : this.toolsPopover.hidden === true;
    this.toolsPopover.hidden = !open;
    this.toolsButton.setAttribute("aria-expanded", String(open));
    if (open) {
      this.closeCuratorMenu();
      this.scopeButtons[0]?.focus();
    } else if (force === false) {
      this.toolsButton.focus();
    }
  }

  openCuratorMenu(projectId, trigger) {
    const project = this.projects.find((item) => item.id === projectId);
    if (!project || !this.canCurateFeatured) return;
    this.toggleTools(false);
    this._curatorTrigger = trigger;
    this._curatorProjectId = projectId;
    this.curatorControls = [];
    this.curatorRankInput = null;
    this.curatorPopover.replaceChildren();
    const header = this.el(
      "div",
      { class: "mx-project-browser-curator-header" },
      this.el(
        "span",
        { class: "mx-project-browser-curator-header-icon" },
        this.el("i", { class: "fa fa-bookmark", "aria-hidden": "true" }),
      ),
      this.el(
        "strong",
        { class: "mx-project-browser-curator-title" },
        this.label("project_featured"),
      ),
    );
    const toggle = this.el(
      "button",
      {
        class: "btn mx-project-browser-curator-action",
        type: "button",
        dataset: { action: "featured-toggle", projectId },
        role: "menuitem",
      },
      this.label(
        project.featured_rank === null
          ? "project_featured_add"
          : "project_featured_remove",
      ),
    );
    toggle.prepend(
      this.el("i", {
        class:
          project.featured_rank === null
            ? "fa fa-bookmark"
            : "fa fa-bookmark-o",
        "aria-hidden": "true",
      }),
    );
    this.curatorControls.push(toggle);
    this.curatorPopover.append(header, toggle);
    const rankLabel = this.el(
      "label",
      { class: "mx-project-browser-rank-label" },
      this.label("project_featured_rank"),
    );
    const rank = this.el("input", {
      class: "form-control mx-project-browser-rank-input",
      type: "number",
      min: "1",
      step: "1",
      dataset: { featuredRank: projectId },
    });
    rank.value =
      project.featured_rank === null ? "" : String(project.featured_rank);
    this.curatorRankInput = rank;
    this.curatorControls.push(rank);
    rankLabel.appendChild(rank);
    const save = this.el(
      "button",
      {
        class: "btn btn-primary mx-project-browser-rank-save",
        type: "button",
        dataset: { action: "featured-rank", projectId },
      },
      this.label("project_featured_save_rank"),
    );
    save.prepend(
      this.el("i", {
        class: "fa fa-check",
        "aria-hidden": "true",
      }),
    );
    this.curatorControls.push(save);
    this.curatorPopover.append(rankLabel, save);
    this.curatorPopover.hidden = false;
    if (trigger) {
      const hostRect = this.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      const popoverHeight = this.curatorPopover.offsetHeight;
      const spaceBelow = hostRect.bottom - triggerRect.bottom;
      const top =
        spaceBelow >= popoverHeight + 8
          ? triggerRect.bottom - hostRect.top + 4
          : triggerRect.top - hostRect.top - popoverHeight - 4;
      const popoverWidth = this.curatorPopover.offsetWidth;
      const preferredLeft =
        triggerRect.left -
        hostRect.left +
        triggerRect.width / 2 -
        popoverWidth / 2;
      const maxLeft = Math.max(8, hostRect.width - popoverWidth - 8);
      const maxTop = Math.max(8, hostRect.height - popoverHeight - 8);
      this.curatorPopover.style.top = `${Math.min(Math.max(8, top), maxTop)}px`;
      this.curatorPopover.style.left = `${Math.min(
        Math.max(8, preferredLeft),
        maxLeft,
      )}px`;
    }
    trigger?.setAttribute("aria-expanded", "true");
    toggle.focus();
  }

  closeCuratorMenu({ restoreFocus = false } = {}) {
    if (!this.curatorPopover || this.curatorPopover.hidden) return;
    this._curatorTrigger?.setAttribute("aria-expanded", "false");
    this.curatorPopover.hidden = true;
    if (restoreFocus) this._curatorTrigger?.focus();
    this._curatorTrigger = null;
    this._curatorProjectId = null;
  }

  onOutsidePointerDown(event) {
    if (!this.contains(event.target)) {
      this.toolsPopover && (this.toolsPopover.hidden = true);
      this.toolsButton?.setAttribute("aria-expanded", "false");
      this.closeCuratorMenu();
      return;
    }
    if (
      this.toolsPopover &&
      !this.toolsPopover.hidden &&
      !this.toolsPopover.contains(event.target) &&
      !this.toolsButton.contains(event.target)
    ) {
      this.toolsPopover.hidden = true;
      this.toolsButton.setAttribute("aria-expanded", "false");
    }
    if (
      this.curatorPopover &&
      !this.curatorPopover.hidden &&
      !this.curatorPopover.contains(event.target) &&
      !event.target.closest('[data-action="curator-menu"]')
    ) {
      this.closeCuratorMenu();
    }
  }

  async setFavorite(projectId) {
    const project = this.projects.find((item) => item.id === projectId);
    if (!project || this.pendingProjects.has(projectId)) return;
    const previous = project.is_favorite;
    project.is_favorite = !previous;
    this.pendingProjects.add(projectId);
    this.renderResults();
    let errorKey = null;
    try {
      const response = await ws.emitAsync(
        "/client/project/favorite/set",
        { id_project: projectId, favorite: project.is_favorite },
        30 * 1000,
      );
      if (response?.error) throw new Error(response.error);
    } catch (error) {
      console.error("Project favorite error", error);
      project.is_favorite = previous;
      errorKey = "project_favorite_error";
    } finally {
      this.pendingProjects.delete(projectId);
      this.renderResults();
      if (errorKey) this.showError(errorKey);
    }
  }

  async setFeatured(projectId, { featured, rank } = {}) {
    const project = this.projects.find((item) => item.id === projectId);
    if (!project || this.pendingProjects.has(projectId)) return;
    const previous = project.featured_rank;
    const restoreCuratorFocus = this._curatorProjectId === projectId;
    this.pendingProjects.add(projectId);
    for (const control of this.curatorControls) {
      control.disabled = true;
    }
    let errorKey = null;
    try {
      const payload = { id_project: projectId, featured };
      if (rank !== undefined) payload.rank = rank;
      const response = await ws.emitAsync(
        "/client/project/featured/set",
        payload,
        30 * 1000,
      );
      if (response?.error) throw new Error(response.error);
      project.featured_rank =
        response.featured_rank === null ? null : Number(response.featured_rank);
    } catch (error) {
      console.error("Project featured error", error);
      project.featured_rank = previous;
      errorKey = "project_featured_error";
    } finally {
      this.pendingProjects.delete(projectId);
      this.renderResults();
      if (restoreCuratorFocus) {
        this.curatorTriggers.get(projectId)?.focus();
      }
      if (errorKey) this.showError(errorKey);
    }
  }

  async setLegacy(projectId) {
    const project = this.projects.find((item) => item.id === projectId);
    if (
      !project ||
      !this.canCurateLegacy ||
      this.pendingProjects.has(projectId)
    ) {
      return;
    }
    const previous = project.legacy;
    project.legacy = !previous;
    this.pendingProjects.add(projectId);
    this.renderResults();
    let errorKey = null;
    try {
      const response = await ws.emitAsync(
        "/client/project/legacy/set",
        { id_project: projectId, legacy: project.legacy },
        30 * 1000,
      );
      if (response?.error || typeof response?.legacy !== "boolean") {
        throw new Error(response?.error || "project_legacy_response_invalid");
      }
      project.legacy = response.legacy;
    } catch (error) {
      console.error("Project legacy error", error);
      project.legacy = previous;
      errorKey = "project_legacy_error";
    } finally {
      this.pendingProjects.delete(projectId);
      this.renderResults();
      if (errorKey) this.showError(errorKey);
    }
  }

  showError(key) {
    this.message.hidden = false;
    this.message.textContent = this.label(key);
    this.message.classList.add("text-danger");
  }

  async loadLogos(projects) {
    const ids = projects
      .filter(
        (project) =>
          project.has_logo &&
          !this.logos.has(project.id) &&
          !this.pendingLogos.has(project.id),
      )
      .map((project) => project.id);
    for (let index = 0; index < ids.length; index += 20) {
      const batch = ids.slice(index, index + 20);
      batch.forEach((id) => this.pendingLogos.add(id));
      try {
        const response = await ws.emitAsync(
          "/client/project/logos/get",
          { ids: batch },
          30 * 1000,
        );
        if (response?.error) throw new Error(response.error);
        for (const [id, logo] of Object.entries(response?.logos || {})) {
          this.logos.set(id, logo);
          const avatar = this.avatarElements.get(id);
          if (avatar) {
            this.setLogo(
              avatar,
              logo,
              this.projects.find((project) => project.id === id)?.title,
            );
          }
        }
      } catch (error) {
        console.warn("Project logos error", error);
      } finally {
        batch.forEach((id) => this.pendingLogos.delete(id));
      }
    }
  }

  setLogo(container, logo, title) {
    const image = this.el("img", { title: title || "" });
    image.alt = "";
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logo)}`;
    container.replaceChildren(image);
  }

  resetResults() {
    this.renderLimit = PROJECT_LIST_INITIAL_SIZE;
    this.renderResults({ resetScroll: true });
  }

  loadMore() {
    const total = this.selectedProjects.length;
    const nextLimit = nextProjectRenderLimit(this.renderLimit, total);
    if (nextLimit === this.renderLimit) return;
    this.renderLimit = nextLimit;
    this.renderResults();
  }

  onScroll() {
    if (
      this.results.scrollTop + this.results.clientHeight >=
      this.results.scrollHeight - 160
    ) {
      this.loadMore();
    }
  }

  onInput(event) {
    if (event.target !== this.searchInput) return;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.state.search = event.target.value;
      this.resetResults();
    }, 100);
  }

  onChange(event) {
    const filter = event.target.dataset.filter;
    if (!filter) return;
    if (filter === "theme") {
      this.state.themes = event.target.value ? [event.target.value] : [];
    } else {
      this.state[filter] = event.target.value;
    }
    if (filter === "sort") this.updateSortDescription();
    this.resetResults();
  }

  async onClick(event) {
    const scopeButton = event.target.closest("[data-scope]");
    if (scopeButton) {
      this.state.scope = scopeButton.dataset.scope;
      this.resetResults();
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const projectId = action.dataset.projectId;
    switch (action.dataset.action) {
      case "toggle-tools":
        this.toggleTools();
        return;
      case "clear":
        this.state = { ...DEFAULT_STATE, themes: [] };
        this.searchInput.value = "";
        this.roleSelect.value = this.state.role;
        this.themeSelect.value = "";
        this.sortSelect.value = this.state.sort;
        this.updateSortDescription();
        this.resetResults();
        return;
      case "favorite":
        await this.setFavorite(projectId);
        return;
      case "legacy":
        await this.setLegacy(projectId);
        return;
      case "delete": {
        const project = this.projects.find((item) => item.id === projectId);
        const deleted = await this.options?.onDeleteRequested?.(
          projectId,
          project?.title,
        );
        if (deleted === true) {
          this.projects = this.projects.filter((item) => item.id !== projectId);
          this.renderResults();
        }
        return;
      }
      case "curator-menu":
        if (
          !this.curatorPopover.hidden &&
          this._curatorProjectId === projectId
        ) {
          this.closeCuratorMenu({ restoreFocus: true });
        } else {
          this.openCuratorMenu(projectId, action);
        }
        return;
      case "featured-toggle": {
        const project = this.projects.find((item) => item.id === projectId);
        await this.setFeatured(projectId, {
          featured: project?.featured_rank === null,
        });
        return;
      }
      case "featured-rank": {
        const input = this.curatorRankInput;
        const rank = Number(input?.value);
        if (!Number.isInteger(rank) || rank <= 0) {
          input?.setCustomValidity(this.label("project_featured_rank"));
          input?.reportValidity();
          return;
        }
        await this.setFeatured(projectId, { featured: true, rank });
        return;
      }
      default:
        await this.runAction(action.dataset.action, projectId);
    }
  }

  async onKeydown(event) {
    if (event.key === "Escape") {
      if (!this.curatorPopover.hidden) {
        event.preventDefault();
        this.closeCuratorMenu({ restoreFocus: true });
      } else if (!this.toolsPopover.hidden) {
        event.preventDefault();
        this.toggleTools(false);
      }
      return;
    }
    if (
      !this.curatorPopover.hidden &&
      ["ArrowDown", "ArrowUp"].includes(event.key)
    ) {
      const controls = this.curatorControls;
      const current = controls.indexOf(event.target);
      if (current >= 0) {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        controls[
          (current + direction + controls.length) % controls.length
        ].focus();
      }
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest(
      '.mx-project-browser-row[data-action="open"]',
    );
    if (row && event.target === row) {
      event.preventDefault();
      await this.runAction("open", row.dataset.projectId);
    }
  }

  onContextMenu(event) {
    if (!this.canCurateFeatured) return;
    const row = event.target.closest(".mx-project-browser-row");
    if (!row) return;
    event.preventDefault();
    const trigger = this.curatorTriggers.get(row.dataset.projectId);
    this.openCuratorMenu(row.dataset.projectId, trigger);
  }

  async runAction(action, projectId) {
    if (!projectId) return;
    if (action === "join") {
      requestProjectMembership(projectId);
      return;
    }
    if (action === "open") {
      const projectLoaded = await setProject(
        projectId,
        {
          onRequest: (requestedProjectId) => {
            this.options?.onProjectRequested?.(requestedProjectId);
          },
        },
        "project_list",
      );
      if (projectLoaded === true) this.options?.onProjectLoaded?.(projectId);
    }
  }
}

if (!customElements.get("mx-project-list")) {
  customElements.define("mx-project-list", ProjectListElement);
}
