import { el } from "../../el/src/index.js";
import { Page } from "./page.js";
import { Box } from "./box.js";

class Workspace extends Box {
  constructor(boxParent) {
    super(boxParent);
    const workspace = this;
    workspace.title = "workspace";
    workspace.init({
      class: ["mc-workspace"],
      boxContainer: boxParent,
      content: workspace.buildEl(),
      draggable: false,
      resizable: false,
      removers: [workspace.onWorkspaceRemove.bind(workspace)],
    });

    workspace.page = new Page(workspace);
    workspace.page.setTopLeft({
      top: 20,
      left: 20,
      inPx: true,
    });
  }

  onWorkspaceRemove() {
    const ws = this;
    ws.page.destroy();
  }

  buildEl() {
    return el("div", {
      class: "mc-workspace-content",
    });
  }
}

export { Workspace };
