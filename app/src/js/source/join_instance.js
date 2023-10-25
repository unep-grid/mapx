import { SourcesJoinManager } from "./join";

export async function modalSourceJoin() {
  try {
    const msj = new SourcesJoinManager();
    await msj.init();
  } catch (e) {
    console.error(e);
  }
}
