import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  emitAsync,
  requestProjectMembership,
  setProject,
  settingsValue,
} = vi.hoisted(() => ({
  emitAsync: vi.fn(),
  requestProjectMembership: vi.fn(),
  setProject: vi.fn(),
  settingsValue: {
    language: "en",
    project: { id: "CURRENT" },
    user: { guest: false },
  },
}));

vi.mock("../mx.js", () => ({ ws: { emitAsync } }));
vi.mock("../language", () => ({
  getDictItem: vi.fn(async (keys) => keys),
}));
vi.mock("../settings", () => ({
  settings: settingsValue,
}));
vi.mock("../map_helpers/index.js", () => ({
  requestProjectMembership,
  setProject,
}));

import { ProjectListElement } from "./list.js";

const projects = [
  {
    id: "MX-AAA11-BBB22-CCC33",
    title: "Zulu",
    description: "Ocean project",
    themes: ["oceans"],
    role: "admin",
    is_member: true,
    is_favorite: false,
    featured_rank: null,
    legacy: false,
    view_count: 2,
    collaborator_count: 8,
    date_created: "2026-06-01T00:00:00Z",
  },
  {
    id: "MX-DDD44-EEE55-FFF66",
    title: "Alpha",
    description: "Land project",
    themes: ["environment"],
    role: "public",
    is_member: false,
    is_favorite: false,
    featured_rank: 1000,
    legacy: false,
    allow_join: true,
    view_count: 20,
    collaborator_count: 2,
    date_created: "2026-01-01T00:00:00Z",
  },
];

const archivedProjects = projects.map((project, index) =>
  index === 1
    ? { ...project, featured_rank: null, legacy: true }
    : { ...project },
);

async function mount(response = { projects }) {
  emitAsync.mockResolvedValueOnce(response);
  const element = new ProjectListElement();
  element.configure({ language: "en" });
  document.body.appendChild(element);
  await vi.waitFor(() => expect(element.projects).toHaveLength(2));
  return element;
}

describe("mx-project-list", () => {
  beforeEach(() => {
    emitAsync.mockReset();
    requestProjectMembership.mockReset();
    setProject.mockReset();
    settingsValue.user.guest = false;
    document.body.replaceChildren();
  });

  it("keeps search visible and applies metadata-derived popover filters", async () => {
    const element = await mount();
    expect(element.elementCreator.document).toBe(element.ownerDocument);
    expect(element.searchInput.ownerDocument).toBe(element.ownerDocument);
    expect(element.searchInput).not.toBeNull();
    expect(element.toolsPopover.hidden).toBe(true);
    element.toolsButton.click();
    expect(element.toolsPopover.hidden).toBe(false);
    expect(element.toolsButton.getAttribute("aria-expanded")).toBe("true");

    element.roleSelect.value = "admin";
    element.roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(element.selectedProjects.map((project) => project.id)).toEqual([
      "MX-AAA11-BBB22-CCC33",
    ]);
    expect(element.toolsButton.classList).toContain(
      "mx-project-browser-tools-active",
    );
  });

  it("keeps public access implicit and renders compact accessible role shields", async () => {
    const element = await mount();
    expect([...element.roleSelect.options].map((option) => option.value)).toEqual([
      "any",
      "admin",
    ]);
    const adminRole = element.rows.querySelector(
      `[data-project-id="${projects[0].id}"] .mx-project-role`,
    );
    expect(adminRole.title).toBe("admin");
    expect(adminRole.getAttribute("aria-label")).toBe(
      "project_list_role: admin",
    );
    expect(adminRole.querySelector(".mx-icon.mx-shield")).not.toBeNull();
    expect(adminRole.querySelector(".mx-project-role-initial").innerText).toBe(
      "A",
    );
    expect(adminRole.parentElement).toBe(
      element.rows.querySelector(
        `[data-project-id="${projects[0].id}"] .mx-project-browser-avatar-wrap`,
      ),
    );
    expect(
      element.rows.querySelector(
        `[data-project-id="${projects[1].id}"] .mx-project-role`,
      ),
    ).toBeNull();
  });

  it("explains date sorting and reset behavior", async () => {
    const element = await mount();
    expect(element.sortSelect.title).toBe(
      "project_list_sort_default_desc",
    );
    expect(element.clearButton.title).toBe("project_list_clear_desc");
    expect([...element.sortSelect.options].map((option) => option.value)).toEqual([
      "default",
      "created_desc",
      "created_asc",
      "name_asc",
      "name_desc",
      "views_desc",
      "views_asc",
      "collaborators_desc",
      "collaborators_asc",
    ]);

    element.sortSelect.value = "created_desc";
    element.sortSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(element.sortSelect.title).toBe("project_list_sort_created_desc_desc");

    element.sortSelect.value = "created_asc";
    element.sortSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(element.sortSelect.title).toBe("project_list_sort_created_asc_desc");
  });

  it("renders authenticated and root-only controls from server metadata", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
      can_curate_legacy: true,
    });
    expect(
      element.rows.querySelectorAll("[data-action='favorite']"),
    ).toHaveLength(2);
    expect(
      element.rows.querySelectorAll("[data-action='curator-menu']"),
    ).toHaveLength(2);
    expect(
      element.rows.querySelectorAll("[data-action='legacy']"),
    ).toHaveLength(2);
    expect(
      element.rows.querySelector(
        `[data-project-id="${projects[1].id}"] [data-action="legacy"]`,
      ).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      element.rows.querySelector(
        `[data-project-id="${projects[0].id}"] [data-action="legacy"] .mx-archive-box`,
      ),
    ).not.toBeNull();
    expect(
      element.rows.querySelector(
        `[data-project-id="${projects[1].id}"] [data-action="legacy"] .mx-archive-box`,
      ),
    ).not.toBeNull();
    expect(element.rows.querySelector(".mx-project-browser-menu-button"))
      .toBeNull();
    expect(
      element.rows.querySelector(
        `[data-project-id="${projects[0].id}"] [data-action="curator-menu"] .fa-bookmark-o`,
      ),
    ).not.toBeNull();
    expect(
      element.rows.querySelector(
        `[data-project-id="${projects[1].id}"] [data-action="curator-menu"] .fa-bookmark`,
      ),
    ).not.toBeNull();
  });

  it("only shows the delete action for legacy projects, and only for curators", async () => {
    const withCurator = await mount({
      projects: archivedProjects,
      can_curate_legacy: true,
    });
    expect(
      withCurator.rows.querySelector(
        `[data-project-id="${projects[0].id}"] [data-action="delete"]`,
      ),
    ).toBeNull();
    expect(
      withCurator.rows.querySelector(
        `[data-project-id="${projects[1].id}"] [data-action="delete"]`,
      ),
    ).not.toBeNull();

    document.body.replaceChildren();
    const withoutCurator = await mount({
      projects: archivedProjects,
      can_curate_legacy: false,
    });
    expect(
      withoutCurator.rows.querySelector("[data-action='delete']"),
    ).toBeNull();
  });

  it("delegates delete clicks and drops the row once deletion succeeds", async () => {
    const onDeleteRequested = vi.fn().mockResolvedValue(true);
    emitAsync.mockResolvedValueOnce({
      projects: archivedProjects,
      can_curate_legacy: true,
    });
    const element = new ProjectListElement();
    element.configure({ language: "en", onDeleteRequested });
    document.body.appendChild(element);
    await vi.waitFor(() => expect(element.projects).toHaveLength(2));

    const button = element.rows.querySelector(
      `[data-project-id="${projects[1].id}"] [data-action="delete"]`,
    );
    button.click();
    await vi.waitFor(() => expect(onDeleteRequested).toHaveBeenCalled());

    expect(onDeleteRequested).toHaveBeenCalledWith(
      projects[1].id,
      projects[1].title,
    );
    await vi.waitFor(() =>
      expect(
        element.projects.some((project) => project.id === projects[1].id),
      ).toBe(false),
    );
  });

  it("keeps the row when the delete flow is cancelled or fails", async () => {
    const onDeleteRequested = vi.fn().mockResolvedValue(false);
    const element = await mount({
      projects: archivedProjects,
      can_curate_legacy: true,
    });
    element.options.onDeleteRequested = onDeleteRequested;

    const button = element.rows.querySelector(
      `[data-project-id="${projects[1].id}"] [data-action="delete"]`,
    );
    button.click();
    await vi.waitFor(() => expect(onDeleteRequested).toHaveBeenCalled());

    expect(
      element.projects.some((project) => project.id === projects[1].id),
    ).toBe(true);
  });

  it("renders statistic icons and orders title, featured, then favorite", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
    });
    const featuredRow = element.rows.querySelector(
      `[data-project-id="${projects[1].id}"]`,
    );
    const stats = featuredRow.querySelectorAll(".mx-project-browser-stat");
    expect(stats).toHaveLength(2);
    expect(stats[0].querySelector(".mx-icon.mx-view")).not.toBeNull();
    expect(stats[0].querySelector(".mx-project-browser-stat-value").innerText)
      .toBe("20");
    expect(stats[1].querySelector(".fa-users")).not.toBeNull();
    expect(stats[1].querySelector(".mx-project-browser-stat-value").innerText)
      .toBe("2");

    const heading = [
      ...featuredRow.querySelector(".mx-project-browser-heading").children,
    ];
    const titleIndex = heading.findIndex((item) =>
      item.classList.contains("mx-project-browser-title"),
    );
    const featuredIndex = heading.findIndex((item) =>
      item.classList.contains("mx-project-browser-featured"),
    );
    const favoriteIndex = heading.findIndex((item) =>
      item.classList.contains("mx-project-browser-favorite"),
    );
    const statsIndex = heading.findIndex((item) =>
      item.classList.contains("mx-project-browser-stats"),
    );
    expect(titleIndex).toBe(0);
    expect(featuredIndex).toBeGreaterThan(titleIndex);
    expect(featuredIndex).toBeLessThan(favoriteIndex);
    expect(statsIndex).toBe(heading.length - 1);
    expect(statsIndex).toBeGreaterThan(favoriteIndex);
  });

  it("renders statistics at the end of the title line", async () => {
    const element = await mount();
    const row = element.rows.querySelector(
      `[data-project-id="${projects[0].id}"]`,
    );
    const text = row.querySelector(".mx-project-browser-text");
    const heading = text.querySelector(".mx-project-browser-heading");
    const meta = text.querySelector(".mx-project-browser-meta");
    const stats = heading.querySelector(".mx-project-browser-stats");

    expect(stats).not.toBeNull();
    expect(stats.parentElement).toBe(heading);
    expect(heading.lastElementChild).toBe(stats);
    expect([...row.children]).not.toContain(stats);
    expect(meta.querySelector(".mx-project-browser-stats")).toBeNull();
  });

  it("keeps the compact Join action outside responsive-hidden statistics", async () => {
    const element = await mount();
    const publicRow = element.rows.querySelector(
      `[data-project-id="${projects[1].id}"]`,
    );
    const join = publicRow.querySelector("[data-action='join']");

    expect(join.parentElement).toBe(
      publicRow.querySelector(".mx-project-browser-heading"),
    );
    expect(join.closest(".mx-project-browser-stats")).toBeNull();
    expect(join.querySelector(".fa-sign-in")).not.toBeNull();
    expect(join.getAttribute("aria-label")).toBe("btn_join_project");
    expect(join.title).toBe("btn_join_project");
    expect(join.disabled).toBe(false);

    join.click();
    await vi.waitFor(() =>
      expect(requestProjectMembership).toHaveBeenCalledWith(projects[1].id),
    );
    expect(setProject).not.toHaveBeenCalled();
  });

  it("hides Join when membership requests are not allowed", async () => {
    const element = await mount({
      projects: projects.map((project) => ({
        ...project,
        allow_join: false,
      })),
    });
    const join = element.rows.querySelector("[data-action='join']");

    expect(join).toBeNull();
    expect(requestProjectMembership).not.toHaveBeenCalled();
  });

  it("refreshes the root bookmark state after successful mutations", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
    });

    emitAsync.mockResolvedValueOnce({ featured_rank: null });
    await element.setFeatured(projects[1].id, { featured: false });
    expect(
      element.rows
        .querySelector(`[data-project-id="${projects[1].id}"]`)
        .querySelector(".mx-project-browser-featured .fa-bookmark-o"),
    ).not.toBeNull();

    emitAsync.mockResolvedValueOnce({ featured_rank: 2000 });
    await element.setFeatured(projects[0].id, { featured: true });
    expect(
      element.rows
        .querySelector(`[data-project-id="${projects[0].id}"]`)
        .querySelector(".mx-project-browser-featured .fa-bookmark"),
    ).not.toBeNull();
  });

  it("renders ordinary-user featured and favorite states independently", async () => {
    const element = await mount({
      projects,
      can_curate_featured: false,
    });
    const unfeaturedRow = element.rows.querySelector(
      `[data-project-id="${projects[0].id}"]`,
    );
    const featuredRow = element.rows.querySelector(
      `[data-project-id="${projects[1].id}"]`,
    );

    expect(
      unfeaturedRow.querySelector(".mx-project-browser-featured"),
    ).toBeNull();
    expect(
      featuredRow.querySelector(
        ".mx-project-browser-featured:not([data-action]) .fa-bookmark",
      ),
    ).not.toBeNull();
    expect(
      featuredRow.querySelector(".mx-project-browser-legacy"),
    ).toBeNull();
    expect(
      element.rows.querySelectorAll("[data-action='favorite']"),
    ).toHaveLength(2);
  });

  it("disables mutually exclusive Featured and Archived actions", async () => {
    const featuredElement = await mount({
      projects,
      can_curate_featured: true,
      can_curate_legacy: true,
    });
    const archiveFeatured = featuredElement.rows.querySelector(
      `[data-project-id="${projects[1].id}"] [data-action="legacy"]`,
    );
    expect(archiveFeatured.disabled).toBe(true);
    expect(archiveFeatured.title).toBe("project_legacy_featured_blocked");
    expect(
      archiveFeatured.classList.contains("mx-project-browser-action-blocked"),
    ).toBe(true);

    document.body.replaceChildren();
    const archivedElement = await mount({
      projects: archivedProjects,
      can_curate_featured: true,
      can_curate_legacy: true,
    });
    const featureArchived = archivedElement.rows.querySelector(
      `[data-project-id="${projects[1].id}"] [data-action="curator-menu"]`,
    );
    expect(featureArchived.disabled).toBe(true);
    expect(featureArchived.title).toBe("project_featured_legacy_blocked");
    expect(
      featureArchived.classList.contains("mx-project-browser-action-blocked"),
    ).toBe(true);

    await archivedElement.setFeatured(projects[1].id, { featured: true });
    await featuredElement.setLegacy(projects[1].id);
    expect(emitAsync).not.toHaveBeenCalledWith(
      "/client/project/featured/set",
      expect.anything(),
      expect.anything(),
    );
    expect(emitAsync).not.toHaveBeenCalledWith(
      "/client/project/legacy/set",
      expect.anything(),
      expect.anything(),
    );
  });

  it("hides personal and curator controls from guests", async () => {
    settingsValue.user.guest = true;
    const element = await mount({
      projects,
      can_curate_featured: false,
    });
    expect(element.rows.querySelector("[data-action='favorite']")).toBeNull();
    expect(element.rows.querySelector("[data-action='join']")).toBeNull();
    expect(
      element.rows.querySelector("[data-action='curator-menu']"),
    ).toBeNull();
    expect(
      element.rows.querySelector(
        `[data-project-id="${projects[0].id}"] .mx-project-browser-featured`,
      ),
    ).toBeNull();
    expect(
      element.rows.querySelector(
        `[data-project-id="${projects[1].id}"] .mx-project-browser-featured .fa-bookmark`,
      ),
    ).not.toBeNull();
    expect(element.querySelector(".mx-project-browser-scopes").hidden).toBe(
      true,
    );
    expect(element.roleSelect.closest(".mx-project-browser-tool").hidden).toBe(
      true,
    );
  });

  it("does not open a project when favorite or menu actions are used", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
    });
    emitAsync.mockResolvedValueOnce({ success: true });
    element.rows.querySelector("[data-action='favorite']").click();
    await vi.waitFor(() =>
      expect(emitAsync).toHaveBeenCalledWith(
        "/client/project/favorite/set",
        expect.any(Object),
        expect.any(Number),
      ),
    );
    expect(setProject).not.toHaveBeenCalled();

    element.rows.querySelector("[data-action='curator-menu']").click();
    expect(element.curatorPopover.hidden).toBe(false);
    expect(setProject).not.toHaveBeenCalled();
  });

  it("opens from the heading title but ignores passive and disabled heading controls", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
      can_curate_legacy: true,
    });
    const featuredRow = element.rows.querySelector(
      `[data-project-id="${projects[1].id}"]`,
    );
    const title = featuredRow.querySelector(".mx-project-browser-title");
    const heading = featuredRow.querySelector(".mx-project-browser-heading");
    const stats = featuredRow.querySelector(".mx-project-browser-stats");
    const disabledArchive = featuredRow.querySelector(
      '[data-action="legacy"]',
    );

    setProject.mockResolvedValueOnce(true);
    title.click();
    await vi.waitFor(() =>
      expect(setProject).toHaveBeenCalledWith(
        projects[1].id,
        expect.any(Object),
        "project_list",
      ),
    );

    setProject.mockClear();
    emitAsync.mockClear();
    stats.click();
    heading.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    disabledArchive.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(disabledArchive.disabled).toBe(true);
    expect(setProject).not.toHaveBeenCalled();
    expect(emitAsync).not.toHaveBeenCalled();
  });

  it("allows an unfeatured project to be featured with an explicit rank", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
    });
    const trigger = element.rows.querySelector(
      `[data-project-id="${projects[0].id}"] [data-action="curator-menu"]`,
    );
    trigger.click();
    expect(element.curatorRankInput.value).toBe("");
    element.curatorRankInput.value = "250";
    emitAsync.mockResolvedValueOnce({ featured_rank: 250 });

    element.curatorPopover
      .querySelector("[data-action='featured-rank']")
      .click();

    await vi.waitFor(() =>
      expect(emitAsync).toHaveBeenCalledWith(
        "/client/project/featured/set",
        {
          id_project: projects[0].id,
          featured: true,
          rank: 250,
        },
        expect.any(Number),
      ),
    );
  });

  it("rolls an optimistic favorite back and reports API errors", async () => {
    const element = await mount();
    emitAsync.mockResolvedValueOnce({ error: "failed" });
    const id = projects[0].id;
    await element.setFavorite(id);
    expect(
      element.projects.find((project) => project.id === id).is_favorite,
    ).toBe(false);
    expect(element.message.textContent).toBe("project_favorite_error");
  });

  it("lets root users toggle archived status and refreshes the indicator", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
      can_curate_legacy: true,
    });
    emitAsync.mockResolvedValueOnce({ legacy: true });

    await element.setLegacy(projects[0].id);

    expect(emitAsync).toHaveBeenCalledWith(
      "/client/project/legacy/set",
      { id_project: projects[0].id, legacy: true },
      expect.any(Number),
    );
    expect(
      element.rows.querySelector(
        `[data-project-id="${projects[0].id}"] [data-action="legacy"]`,
      ).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      element.rows.querySelector(
        `[data-project-id="${projects[0].id}"] [data-action="legacy"] .mx-archive-box-closed`,
      ),
    ).not.toBeNull();
  });

  it("rolls an optimistic archived status change back on API errors", async () => {
    const element = await mount({
      projects,
      can_curate_legacy: true,
    });
    emitAsync.mockResolvedValueOnce({ error: "failed" });

    await element.setLegacy(projects[0].id);

    expect(
      element.projects.find((project) => project.id === projects[0].id).legacy,
    ).toBe(false);
    expect(element.message.textContent).toBe("project_legacy_error");
  });

  it("restores focus when Escape closes a curator menu", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
    });
    const trigger = element.rows.querySelector("[data-action='curator-menu']");
    trigger.click();
    element.curatorPopover.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(element.curatorPopover.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it("clamps the curator popover beside its bookmark trigger", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
    });
    const trigger = element.rows.querySelector("[data-action='curator-menu']");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      left: 0,
      right: 760,
      top: 0,
      bottom: 600,
      width: 760,
      height: 600,
    });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      left: 700,
      right: 724,
      top: 100,
      bottom: 126,
      width: 24,
      height: 26,
    });
    Object.defineProperties(element.curatorPopover, {
      offsetWidth: { configurable: true, value: 250 },
      offsetHeight: { configurable: true, value: 200 },
    });

    trigger.click();

    expect(element.curatorPopover.style.left).toBe("502px");
    expect(element.curatorPopover.style.top).toBe("130px");
  });

  it("returns focus to the refreshed bookmark after curation", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
    });
    const trigger = element.rows.querySelector(
      `[data-project-id="${projects[1].id}"] [data-action="curator-menu"]`,
    );
    trigger.click();
    emitAsync.mockResolvedValueOnce({ featured_rank: null });

    await element.setFeatured(projects[1].id, { featured: false });

    const refreshedTrigger = element.rows.querySelector(
      `[data-project-id="${projects[1].id}"] [data-action="curator-menu"]`,
    );
    expect(document.activeElement).toBe(refreshedTrigger);
    expect(refreshedTrigger.querySelector(".fa-bookmark-o")).not.toBeNull();
  });

  it("reports project requests immediately and successful loads afterward", async () => {
    let resolveProject;
    const projectLoad = new Promise((resolve) => {
      resolveProject = resolve;
    });
    const onProjectRequested = vi.fn();
    const onProjectLoaded = vi.fn();
    const element = new ProjectListElement();
    element.configure({ onProjectRequested, onProjectLoaded });
    setProject.mockImplementationOnce((projectId, options) => {
      options.onRequest(projectId);
      return projectLoad;
    });

    const action = element.runAction("open", projects[0].id);

    expect(setProject).toHaveBeenCalledWith(
      projects[0].id,
      expect.objectContaining({ onRequest: expect.any(Function) }),
      "project_list",
    );
    expect(onProjectRequested).toHaveBeenCalledWith(projects[0].id);
    expect(onProjectLoaded).not.toHaveBeenCalled();

    resolveProject(true);
    await action;
    expect(onProjectLoaded).toHaveBeenCalledWith(projects[0].id);

    setProject.mockResolvedValueOnce(false);
    await element.runAction("open", projects[1].id);
    expect(onProjectRequested).toHaveBeenCalledTimes(1);
    expect(onProjectLoaded).toHaveBeenCalledTimes(1);
  });
});
