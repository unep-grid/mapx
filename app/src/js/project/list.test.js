import { beforeEach, describe, expect, it, vi } from "vitest";

const { emitAsync, setProject, settingsValue } = vi.hoisted(() => ({
  emitAsync: vi.fn(),
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
  requestProjectMembership: vi.fn(),
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
    view_count: 2,
    collaborator_count: 8,
    date_modified: "2026-06-01T00:00:00Z",
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
    view_count: 20,
    collaborator_count: 2,
    date_modified: "2026-01-01T00:00:00Z",
  },
];

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
    setProject.mockReset();
    settingsValue.user.guest = false;
    document.body.replaceChildren();
  });

  it("keeps search visible and applies metadata-derived popover filters", async () => {
    const element = await mount();
    expect(element.searchInput).not.toBeNull();
    expect(element.toolsPopover.hidden).toBe(true);
    element.toolsButton.click();
    expect(element.toolsPopover.hidden).toBe(false);
    expect(element.toolsButton.getAttribute("aria-expanded")).toBe("true");

    element.roleSelect.value = "public";
    element.roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(element.selectedProjects.map((project) => project.id)).toEqual([
      "MX-DDD44-EEE55-FFF66",
    ]);
    expect(element.toolsButton.classList).toContain(
      "mx-project-browser-tools-active",
    );
  });

  it("renders authenticated and root-only controls from server metadata", async () => {
    const element = await mount({
      projects,
      can_curate_featured: true,
    });
    expect(
      element.rows.querySelectorAll("[data-action='favorite']"),
    ).toHaveLength(2);
    expect(
      element.rows.querySelectorAll("[data-action='curator-menu']"),
    ).toHaveLength(2);
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
    expect(titleIndex).toBe(0);
    expect(featuredIndex).toBeGreaterThan(titleIndex);
    expect(featuredIndex).toBeLessThan(favoriteIndex);
  });

  it("renders statistics in the content metadata footer", async () => {
    const element = await mount();
    const row = element.rows.querySelector(
      `[data-project-id="${projects[0].id}"]`,
    );
    const text = row.querySelector(".mx-project-browser-text");
    const meta = text.querySelector(".mx-project-browser-meta");
    const stats = meta.querySelector(".mx-project-browser-stats");

    expect(stats).not.toBeNull();
    expect(stats.parentElement).toBe(meta);
    expect([...row.children]).not.toContain(stats);
    expect(meta.firstElementChild).toBe(stats);
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
      element.rows.querySelectorAll("[data-action='favorite']"),
    ).toHaveLength(2);
  });

  it("hides personal and curator controls from guests", async () => {
    settingsValue.user.guest = true;
    const element = await mount({
      projects,
      can_curate_featured: false,
    });
    expect(element.rows.querySelector("[data-action='favorite']")).toBeNull();
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

  it("reports only successfully loaded projects to its owner", async () => {
    const onProjectLoaded = vi.fn();
    const element = new ProjectListElement();
    element.configure({ onProjectLoaded });
    setProject.mockResolvedValueOnce(true);
    await element.runAction("open", projects[0].id);
    expect(onProjectLoaded).toHaveBeenCalledWith(projects[0].id);
    setProject.mockResolvedValueOnce(false);
    await element.runAction("open", projects[1].id);
    expect(onProjectLoaded).toHaveBeenCalledTimes(1);
  });
});
