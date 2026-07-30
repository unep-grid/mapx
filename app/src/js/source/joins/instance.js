import { SourcesJoinManager } from "./index.js";


export async function modalSourceJoin(opt, { root } = {}) {
  try {
    const msj = new SourcesJoinManager({ root });
    const type = opt.create === true ? "create" : "edit";
    await msj.init(type);
  } catch (e) {
    console.error(e);
  }
}

export async function modalSourceJoinNew({ root } = {}) {
  try {
    const msj = new SourcesJoinManager({ root });
    await msj.init("create");
  } catch (e) {
    console.error(e);
  }
}
