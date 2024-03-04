import { SourcesJoinManager } from "./index.js";


export async function modalSourceJoin(opt) {
  try {
    const msj = new SourcesJoinManager();
    const type = opt.create === true ? "create" : "edit";
    await msj.init(type);
  } catch (e) {
    console.error(e);
  }
}

export async function modalSourceJoinNew() {
  try {
    const msj = new SourcesJoinManager();
    await msj.init("create");
  } catch (e) {
    console.error(e);
  }
}
