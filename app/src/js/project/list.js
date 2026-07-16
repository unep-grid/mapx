import { requestProjectMembership, setProject } from "../map_helpers/index.js";
import { getDictItem } from "../language";
import { settings } from "../settings";
import { ws } from "../mx.js";
import {
  PROJECT_LIST_CHUNK_SIZE,
  PROJECT_LIST_INITIAL_SIZE,
  PROJECT_THEMES,
  nextProjectRenderLimit,
  nextProjectSort,
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
  "project_list_all_accessible",
  "project_list_my_projects",
  "project_list_all_roles",
  "project_list_all_themes",
  "project_list_sort_updated_desc",
  "project_list_sort_updated_asc",
  "project_list_sort_name_asc",
  "project_list_sort_name_desc",
  "project_list_sort_theme",
  "project_list_sort_views_desc",
  "project_list_sort_views_asc",
  "project_list_sort_collaborators_desc",
  "project_list_sort_collaborators_asc",
  "project_list_clear",
  "project_list_project",
  "project_list_role",
  "project_list_views",
  "project_list_collaborators",
  "project_list_updated",
  "project_list_results",
  "project_list_showing",
  "project_list_of",
  "project_list_loading",
  "project_list_error",
  "project_list_empty",
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
  sort: "updated_desc",
  search: "",
};

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined && text !== null) {
    element.textContent = text;
  }
  return element;
}

function makeOption(value, text) {
  const option = makeElement("option", null, text);
  option.value = value;
  return option;
}

export class ProjectListElement extends HTMLElement {
  constructor() {
    super();
    this.projects = [];
    this.logos = new Map();
    this.pendingLogos = new Set();
    this.avatarElements = new Map();
    this.scopeButtons = [];
    this.sortButtons = new Map();
    this.state = { ...DEFAULT_STATE, themes: [] };
    this.renderLimit = PROJECT_LIST_INITIAL_SIZE;
    this.labels = {};
    this.themeLabels = {};
    this._onClick = this.onClick.bind(this);
    this._onChange = this.onChange.bind(this);
    this._onInput = this.onInput.bind(this);
    this._onKeydown = this.onKeydown.bind(this);
    this._onScroll = this.onScroll.bind(this);
  }

  connectedCallback() {
    if (this._connected) {
      return;
    }
    this._connected = true;
    this.classList.add("mx-project-browser");
    this.addEventListener("click", this._onClick);
    this.addEventListener("change", this._onChange);
    this.addEventListener("input", this._onInput);
    this.addEventListener("keydown", this._onKeydown);
    this.init();
  }

  disconnectedCallback() {
    this.removeEventListener("click", this._onClick);
    this.removeEventListener("change", this._onChange);
    this.removeEventListener("input", this._onInput);
    this.removeEventListener("keydown", this._onKeydown);
    this.results?.removeEventListener("scroll", this._onScroll);
    this._intersectionObserver?.disconnect();
    clearTimeout(this._searchTimer);
    this._connected = false;
  }

  /**
   * @param {Object} [options]
   * @param {string} [options.language]
   * @param {Object} [options.initialFilters]
   * @param {(projectId: string) => void} [options.onProjectLoaded]
   */
  configure(options = {}) {
    this.options = options;
    const initial = options.initialFilters || {};
    this.state = {
      ...this.state,
      ...initial,
      themes: Array.isArray(initial.themes) ? initial.themes : [],
    };
  }

  async init() {
    await this.loadLabels();
    if (!this._connected) {
      return;
    }
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
    const controls = makeElement("div", "mx-project-browser-controls");

    const searchWrap = makeElement("label", "mx-project-browser-search-wrap");
    const searchIcon = makeElement("i", "fa fa-search");
    searchIcon.setAttribute("aria-hidden", "true");
    this.searchInput = makeElement(
      "input",
      "form-control mx-project-browser-search",
    );
    this.searchInput.type = "search";
    this.searchInput.value = this.state.search;
    this.searchInput.placeholder = this.label("project_search_values");
    this.searchInput.setAttribute(
      "aria-label",
      this.label("project_search_values"),
    );
    searchWrap.append(searchIcon, this.searchInput);

    const scopes = makeElement("div", "btn-group mx-project-browser-scopes");
    scopes.setAttribute("role", "group");
    for (const [scope, key] of [
      ["accessible", "project_list_all_accessible"],
      ["mine", "project_list_my_projects"],
    ]) {
      const button = makeElement("button", "btn btn-default", this.label(key));
      button.type = "button";
      button.dataset.scope = scope;
      this.scopeButtons.push(button);
      scopes.appendChild(button);
    }

    this.roleSelect = this.buildSelect(
      "role",
      "project_list_role",
      [
        ["any", "project_list_all_roles"],
        ["admin", "admin"],
        ["publisher", "publisher"],
        ["member", "member"],
        ["public", "public"],
      ],
      this.state.role,
    );
    this.themeSelect = this.buildSelect(
      "theme",
      "project_list_all_themes",
      [
        ["", "project_list_all_themes"],
        ...PROJECT_THEMES.map((theme) => [theme, `project_theme_${theme}`]),
      ],
      this.state.themes[0] || "",
    );
    this.sortSelect = this.buildSelect(
      "sort",
      "project_list_sort_updated_desc",
      [
        ["updated_desc", "project_list_sort_updated_desc"],
        ["updated_asc", "project_list_sort_updated_asc"],
        ["name_asc", "project_list_sort_name_asc"],
        ["name_desc", "project_list_sort_name_desc"],
        ["theme_asc", "project_list_sort_theme"],
        ["views_desc", "project_list_sort_views_desc"],
        ["views_asc", "project_list_sort_views_asc"],
        ["collaborators_desc", "project_list_sort_collaborators_desc"],
        ["collaborators_asc", "project_list_sort_collaborators_asc"],
      ],
      this.state.sort,
    );
    this.sortSelect.classList.add("mx-project-browser-compact-sort");

    this.clearButton = makeElement(
      "button",
      "btn btn-link mx-project-browser-clear",
      this.label("project_list_clear"),
    );
    this.clearButton.type = "button";
    this.clearButton.dataset.action = "clear";

    controls.append(
      searchWrap,
      scopes,
      this.roleSelect,
      this.themeSelect,
      this.sortSelect,
      this.clearButton,
    );

    this.results = makeElement("div", "mx-project-browser-results");
    this.results.setAttribute("role", "table");
    this.results.setAttribute("aria-busy", "true");
    this.header = this.buildHeader();
    this.rows = makeElement("div", "mx-project-browser-rows");
    this.message = makeElement(
      "div",
      "mx-project-browser-message",
      this.label("project_list_loading"),
    );
    this.sentinel = makeElement("div", "mx-project-browser-sentinel");
    this.sentinel.setAttribute("aria-hidden", "true");
    this.results.append(this.header, this.rows, this.message, this.sentinel);

    const footer = makeElement("div", "mx-project-browser-footer");
    this.counter = makeElement("span", "mx-project-browser-counter");
    this.counter.setAttribute("aria-live", "polite");
    footer.appendChild(this.counter);
    this.append(controls, this.results, footer);

    this.results.addEventListener("scroll", this._onScroll, { passive: true });
    this.setupIntersectionObserver();
    this.updateControls();
  }

  buildSelect(filter, labelKey, options, value) {
    const select = makeElement("select", "form-control");
    select.dataset.filter = filter;
    select.setAttribute("aria-label", this.label(labelKey));
    for (const [optionValue, optionLabel] of options) {
      select.appendChild(makeOption(optionValue, this.label(optionLabel)));
    }
    select.value = value;
    return select;
  }

  setupIntersectionObserver() {
    if (typeof IntersectionObserver !== "function") {
      return;
    }
    this._intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.loadMore();
        }
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
      if (response?.error) {
        throw new Error(response.error);
      }
      this.projects = (response?.projects || [])
        .map((project) => normalizeProject(project, this.themeLabels))
        .filter((project) => project.id !== settings.project.id);
      this.results.setAttribute("aria-busy", "false");
      this.renderResults();
    } catch (error) {
      console.error("Project list error", error);
      this.results?.setAttribute("aria-busy", "false");
      this.message.textContent = this.label("project_list_error");
      this.message.classList.add("text-danger");
    }
  }

  get selectedProjects() {
    return selectProjects(this.projects, this.state, this.themeLabels);
  }

  renderResults({ resetScroll = false } = {}) {
    const projects = this.selectedProjects;
    const visibleProjects = projects.slice(0, this.renderLimit);
    this.avatarElements.clear();
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
    if (resetScroll) {
      this.results.scrollTop = 0;
    }
    this.loadLogos(visibleProjects);
  }

  buildHeader() {
    const header = makeElement("div", "mx-project-browser-header");
    header.setAttribute("role", "row");
    this.sortButtons.clear();
    for (const [key, column] of [
      ["project_list_project", "name"],
      ["project_list_role", null],
      ["project_list_views", "views"],
      ["project_list_collaborators", "collaborators"],
      ["project_list_updated", "updated"],
    ]) {
      const cell = makeElement("div");
      cell.setAttribute("role", "columnheader");
      if (column) {
        const button = makeElement("button", "mx-project-browser-sort-button");
        button.type = "button";
        button.dataset.sortColumn = column;
        const sortIcon = makeElement("i", "mx-project-browser-sort-icon");
        sortIcon.hidden = true;
        sortIcon.setAttribute("aria-hidden", "true");
        button.append(makeElement("span", null, this.label(key)), sortIcon);
        cell.appendChild(button);
        this.sortButtons.set(column, button);
      } else {
        cell.textContent = this.label(key);
      }
      header.appendChild(cell);
    }
    header.appendChild(makeElement("span"));
    return header;
  }

  buildRow(project) {
    const row = makeElement("div", "mx-project-browser-row");
    row.dataset.projectId = project.id;
    row.dataset.action = "open";
    row.tabIndex = 0;
    row.setAttribute("role", "row");

    const main = makeElement("div", "mx-project-browser-main");
    main.setAttribute("role", "cell");
    const avatar = makeElement(
      "span",
      "mx-project-browser-avatar",
      project.title.slice(0, 1).toUpperCase(),
    );
    avatar.dataset.logoFor = project.id;
    this.avatarElements.set(project.id, avatar);
    if (this.logos.has(project.id)) {
      this.setLogo(avatar, this.logos.get(project.id), project.title);
    }
    const text = makeElement("div", "mx-project-browser-text");
    text.appendChild(
      makeElement("strong", "mx-project-browser-title", project.title),
    );
    if (project.description) {
      text.appendChild(
        makeElement(
          "span",
          "mx-project-browser-description",
          project.description,
        ),
      );
    }
    const meta = makeElement("span", "mx-project-browser-meta");
    if (project.org_name) {
      meta.appendChild(
        makeElement(
          "span",
          "mx-project-browser-organisation",
          project.org_name,
        ),
      );
    }
    for (const theme of project.themes.slice(0, 2)) {
      meta.appendChild(
        makeElement(
          "span",
          "mx-project-browser-theme",
          this.themeLabels[theme] || theme,
        ),
      );
    }
    if (project.themes.length > 2) {
      meta.appendChild(
        makeElement(
          "span",
          "mx-project-browser-theme mx-project-browser-theme-more",
          `+${project.themes.length - 2}`,
        ),
      );
    }
    if (meta.childElementCount > 0) {
      text.appendChild(meta);
    }
    main.append(avatar, text);

    const role = makeElement("div", "mx-project-browser-role");
    role.setAttribute("role", "cell");
    role.appendChild(
      makeElement(
        "span",
        `mx-project-role mx-project-role-${project.role}`,
        this.label(project.role),
      ),
    );
    if (project.role === "public" && settings.user.guest !== true) {
      const join = makeElement(
        "button",
        "btn btn-link btn-xs",
        this.label("btn_join_project"),
      );
      join.type = "button";
      join.dataset.action = "join";
      join.dataset.projectId = project.id;
      join.disabled = !project.allow_join;
      role.appendChild(join);
    }

    const views = this.buildStat(
      "mx-icon mx-view",
      project.view_count,
      "project_list_views",
    );
    const collaborators = this.buildStat(
      "fa fa-users",
      project.collaborator_count,
      "project_list_collaborators",
    );
    const date = makeElement("div", "mx-project-browser-date");
    date.setAttribute("role", "cell");
    const dateIcon = makeElement("i", "fa fa-calendar");
    dateIcon.setAttribute("aria-hidden", "true");
    const dateText = project.modified_time
      ? new Intl.DateTimeFormat(this.options?.language || settings.language, {
          dateStyle: "medium",
        }).format(project.modified_time)
      : "\u2014";
    date.append(dateIcon, this.ownerDocument.createTextNode(` ${dateText}`));
    const chevron = makeElement(
      "i",
      "fa fa-chevron-right mx-project-browser-open",
    );
    chevron.setAttribute("aria-hidden", "true");
    row.append(main, role, views, collaborators, date, chevron);
    return row;
  }

  buildStat(iconClasses, value, labelKey) {
    const stat = makeElement("div", "mx-project-browser-stat");
    stat.setAttribute("role", "cell");
    stat.setAttribute("aria-label", `${this.label(labelKey)}: ${value}`);
    const iconElement = makeElement("i", iconClasses);
    iconElement.setAttribute("aria-hidden", "true");
    stat.append(iconElement, this.ownerDocument.createTextNode(` ${value}`));
    return stat;
  }

  updateControls() {
    for (const button of this.scopeButtons) {
      const active = button.dataset.scope === this.state.scope;
      button.classList.toggle("btn-primary", active);
      button.classList.toggle("btn-default", !active);
      button.setAttribute("aria-pressed", String(active));
    }
    for (const [column, button] of this.sortButtons) {
      const active = this.state.sort.startsWith(`${column}_`);
      const direction = this.state.sort.endsWith("_asc")
        ? "ascending"
        : "descending";
      button.parentElement.setAttribute(
        "aria-sort",
        active ? direction : "none",
      );
      button.dataset.sortActive = String(active);
      const icon = button.lastElementChild;
      icon.hidden = !active;
      icon.className = `fa ${
        this.state.sort.endsWith("_asc") ? "fa-caret-up" : "fa-caret-down"
      } mx-project-browser-sort-icon`;
    }
    if (this.clearButton) {
      const isDefault =
        this.state.scope === DEFAULT_STATE.scope &&
        this.state.role === DEFAULT_STATE.role &&
        this.state.sort === DEFAULT_STATE.sort &&
        this.state.search === DEFAULT_STATE.search &&
        this.state.themes.length === 0;
      this.clearButton.hidden = isDefault;
    }
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
        if (response?.error) {
          throw new Error(response.error);
        }
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
    const image = makeElement("img");
    image.alt = "";
    image.title = title || "";
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
    if (nextLimit === this.renderLimit) {
      return;
    }
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
    if (event.target !== this.searchInput) {
      return;
    }
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.state.search = event.target.value;
      this.resetResults();
    }, 100);
  }

  onChange(event) {
    const filter = event.target.dataset.filter;
    if (!filter) {
      return;
    }
    if (filter === "theme") {
      this.state.themes = event.target.value ? [event.target.value] : [];
    } else {
      this.state[filter] = event.target.value;
    }
    this.resetResults();
  }

  async onClick(event) {
    const sortButton = event.target.closest("[data-sort-column]");
    if (sortButton) {
      this.state.sort = nextProjectSort(
        this.state.sort,
        sortButton.dataset.sortColumn,
      );
      this.sortSelect.value = this.state.sort;
      this.resetResults();
      return;
    }
    const scopeButton = event.target.closest("[data-scope]");
    if (scopeButton) {
      this.state.scope = scopeButton.dataset.scope;
      this.resetResults();
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }
    if (action.dataset.action === "clear") {
      this.state = { ...DEFAULT_STATE, themes: [] };
      this.searchInput.value = "";
      this.roleSelect.value = this.state.role;
      this.themeSelect.value = "";
      this.sortSelect.value = this.state.sort;
      this.resetResults();
      return;
    }
    await this.runAction(action.dataset.action, action.dataset.projectId);
  }

  async onKeydown(event) {
    if (event.key !== "Enter") {
      return;
    }
    const row = event.target.closest(
      '.mx-project-browser-row[data-action="open"]',
    );
    if (row && event.target === row) {
      event.preventDefault();
      await this.runAction("open", row.dataset.projectId);
    }
  }

  async runAction(action, projectId) {
    if (!projectId) {
      return;
    }
    if (action === "join") {
      requestProjectMembership(projectId);
      return;
    }
    if (action === "open") {
      const projectLoaded = await setProject(projectId, {}, "project_list");
      if (projectLoaded === true) {
        this.options?.onProjectLoaded?.(projectId);
      }
    }
  }
}

if (!customElements.get("mx-project-list")) {
  customElements.define("mx-project-list", ProjectListElement);
}
