import "./component.js";
import { getDictItem } from "../../language";
import { getMapxWindowManager } from "../../window";
import { settings } from "../../settings";

export async function openSourceOverlap(_request) {
  const manager = getMapxWindowManager();
  const component =
    manager.root.ownerDocument.createElement("mx-source-overlap");
  return manager.open({
    key: "source-overlap",
    replace: true,
    modal: true,
    title: await getDictItem("title_overlap_tools", settings.language),
    content: component,
    draggable: true,
    resizable: true,
    collapsible: true,
    snappable: true,
    closeable: true,
    geometry: {
      width: "min(620px, calc(100vw - 32px))",
      height: "auto",
      minHeight: "360px",
      maxHeight: "calc(100vh - 32px)",
    },
  });
}
