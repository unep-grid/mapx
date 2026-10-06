import { Uploader } from "./uploader";

let instance;

export async function uploadSource(opt) {
  try {
    if (instance) {
      const destroyed = await instance.destroy();
      if (!destroyed) {
        return instance;
      }
    }
    instance = new Uploader(opt);
    await instance.init();
    return instance;
  } catch (e) {
    instance?.destroy();
    console.error(e);
  }
}
