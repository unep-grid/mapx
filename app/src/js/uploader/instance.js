import { Uploader } from "./uploader";

let instance;

export async function uploadSource(opt) {
  try {
    if (instance) {
      await instance.destroy();
    }
    instance = new Uploader(opt);
    await instance.init();
  } catch (e) {
    instance?.destroy();
    console.error(e);
  }
}
