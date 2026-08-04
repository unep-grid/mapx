import { cleanDiacritic } from "./../string_util/";

export const PROJECT_LIST_INITIAL_SIZE = 30;
export const PROJECT_LIST_CHUNK_SIZE = 20;

export const PROJECT_THEMES = [
  "biota",
  "boundaries",
  "farming",
  "climatologyMeteorologyAtmosphere",
  "economy",
  "elevation",
  "environment",
  "geoscientificInformation",
  "health",
  "imageryBaseMapsEarthCover",
  "intelligenceMilitary",
  "inlandWaters",
  "location",
  "oceans",
  "planningCadastre",
  "society",
  "structure",
  "transportation",
  "utilitiesCommunication",
];

export function cleanProjectText(value) {
  return cleanDiacritic(String(value || "").toLowerCase());
}

function compareText(a, b, direction = 1) {
  return (
    String(a || "").localeCompare(String(b || ""), undefined, {
      sensitivity: "base",
    }) * direction
  );
}

export function parseInitialProjectListFilters({ role, title } = {}) {
  const roles = ["admin", "publisher", "member"];
  const roleQuery = cleanProjectText(Array.isArray(role) ? role[0] : role);
  const matches = roleQuery
    ? roles.filter((candidate) => candidate.startsWith(roleQuery))
    : [];
  const parsedRole = matches.length === 1 ? matches[0] : "any";
  const parsedTitle = String(
    Array.isArray(title) ? title[0] || "" : title || "",
  )
    .replace(/\*+$/, "")
    .trim();

  return {
    role: parsedRole,
    scope: parsedRole === "any" ? "accessible" : "mine",
    search: parsedTitle,
  };
}

export function nextProjectRenderLimit(
  current,
  total,
  chunkSize = PROJECT_LIST_CHUNK_SIZE,
) {
  if (current >= total) {
    return current;
  }
  return Math.min(total, current + chunkSize);
}

const NATURAL_SORT_DIRECTION = {
  name: "asc",
  views: "desc",
  collaborators: "desc",
  updated: "desc",
};

/**
 * Return the next two-state sort for a column. A newly selected column uses
 * its natural direction; selecting it again reverses that direction.
 */
export function nextProjectSort(currentSort, column) {
  const naturalDirection = NATURAL_SORT_DIRECTION[column];
  if (!naturalDirection) return currentSort;
  const naturalSort = `${column}_${naturalDirection}`;
  if (!String(currentSort).startsWith(`${column}_`)) return naturalSort;
  return `${column}_${currentSort.endsWith("_asc") ? "desc" : "asc"}`;
}

export function selectProjects(projects, state, themeLabels = {}) {
  const search = cleanProjectText(state.search);
  const selectedThemes = state.themes || [];
  const filtered = projects.filter((project) => {
    if (state.scope === "mine" && !project.is_member) {
      return false;
    }
    if (state.role !== "any" && project.role !== state.role) {
      return false;
    }
    if (
      selectedThemes.length > 0 &&
      !selectedThemes.every((theme) => project.themes.includes(theme))
    ) {
      return false;
    }
    if (search && !project.search_text.includes(search)) {
      return false;
    }
    return true;
  });

  const selectedSort = (a, b) => {
    const byTitle = () => compareText(a.title, b.title);
    switch (state.sort) {
      case "updated_asc":
        return (a.modified_time || 0) - (b.modified_time || 0) || byTitle();
      case "name_asc":
        return compareText(a.title, b.title);
      case "name_desc":
        return compareText(a.title, b.title, -1);
      case "views_desc":
        return b.view_count - a.view_count || byTitle();
      case "views_asc":
        return a.view_count - b.view_count || byTitle();
      case "collaborators_desc":
        return b.collaborator_count - a.collaborator_count || byTitle();
      case "collaborators_asc":
        return a.collaborator_count - b.collaborator_count || byTitle();
      default:
        return (b.modified_time || 0) - (a.modified_time || 0) || byTitle();
    }
  };

  const defaultSort = (a, b) => {
    if (a.is_favorite !== b.is_favorite) {
      return a.is_favorite ? -1 : 1;
    }
    if (a.is_favorite && b.is_favorite) {
      return compareText(a.title, b.title);
    }
    const aFeatured = a.featured_rank !== null;
    const bFeatured = b.featured_rank !== null;
    if (aFeatured !== bFeatured) {
      return aFeatured ? -1 : 1;
    }
    if (aFeatured && bFeatured) {
      return a.featured_rank - b.featured_rank || compareText(a.title, b.title);
    }
    if (a.legacy !== b.legacy) {
      return a.legacy ? 1 : -1;
    }
    return selectedSort(a, b);
  };

  return filtered.sort(state.sort === "default" ? defaultSort : selectedSort);
}

export function normalizeProject(project, themeLabels = {}) {
  const themes = Array.isArray(project.themes) ? project.themes : [];
  const themeText = themes
    .map((theme) => themeLabels[theme] || theme)
    .join(" ");
  return {
    ...project,
    title: project.title || project.id,
    description: project.description || "",
    org_name: project.org_name || "",
    themes,
    view_count: Number(project.view_count) || 0,
    collaborator_count: Number(project.collaborator_count) || 0,
    featured_rank:
      Number.isInteger(Number(project.featured_rank)) &&
      Number(project.featured_rank) > 0
        ? Number(project.featured_rank)
        : null,
    is_favorite: project.is_favorite === true,
    legacy: project.legacy === true,
    modified_time: project.date_modified
      ? new Date(project.date_modified).getTime()
      : 0,
    search_text: cleanProjectText(
      [project.title, project.description, project.org_name, themeText].join(
        " ",
      ),
    ),
  };
}
