import { SourcesJoinManager } from "./join";

export async function modalSourceJoin() {
  try {
    const msj = new SourcesJoinManager();
    await msj.init();
  } catch (e) {
    console.error(e);
  }
}

export async function modalSourceJoinCreate() {
  try {
    const msj = new SourcesJoinManager();
    await msj.init('create');
  } catch (e) {
    console.error(e);
  }
}
