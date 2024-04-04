import { GeometryTools } from ".";
import { ws } from "../../mx";

let instance;

export async function geomTools(config) {
  try {
    if (instance) {
      instance.destroy();
    }
    instance = new GeometryTools(ws, config);
    await instance.init();
    return instance;
  } catch (e) {
    console.error(e);
  }
}
