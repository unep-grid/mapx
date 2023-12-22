import { UserProjectsListRenderer } from "./list.js";

export async function renderUserProjectsList(o) {
  try {
    const renderer = new UserProjectsListRenderer(o);
    await renderer.render();
  } catch (e) {
    console.error(e.message);
  }
}

