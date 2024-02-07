import { el } from "../el_mapx";
import { clone, makeId } from "../mx_helper_misc";
export class MenuBuilder {
  constructor(elementTarget) {
    const bm = this;
    bm.elementTarget = elementTarget;
    if (!bm.elementTarget.id) {
      bm.elementTarget.id = makeId();
    }
    bm.elMenu = bm.buildMenu();
    bm.insertMenu();
  }

  buildMenu() {
    const bm = this;
    const elPanels = this.elementTarget.querySelectorAll(
      ".panel:not(.panel .panel)",
    );
    return bm.createNestedMenu(elPanels);
  }

  createNestedMenu(elPanels) {
    const bm = this;
    if (elPanels.length === 0) {
      return null;
    }
    const elMenu = el("ul", { class: ["mx-hide-if-empty","list-group"] });
    for (const elPanel of elPanels) {
      const elMenuItem = bm.createMenuItem(elPanel);
      if (elMenuItem) {
        elMenu.appendChild(elMenuItem);
      }
    }
    return elMenu;
  }

  createMenuItem(elPanel) {
    const bm = this;
    const elHeading = elPanel.querySelector(".panel-heading");
    if (!elHeading) {
      return null;
    }
    const id = makeId();
    const elTitleContainer = elHeading.querySelector(".panel-title");
    const elTitle = elTitleContainer.querySelector("span");
    elTitle.id = id;
    const elBack = el(
      "a",
      { href: `#${bm.elementTarget.id}` },
      el("i", { class: ["fa", "fa-chevron-up"] }),
    );
    elHeading.appendChild(elBack);
    const elLink = el(
      "a",
      { href: `#${id}`, dataset: clone(elTitle.dataset) },
      elTitle.cloneNode(),
    );
    const elMenuItem = el("li", { class: ["list-group-item"] }, elLink);
    const elsNestedPanel = elPanel.querySelectorAll(".panel");
    const elNestedMenu = bm.createNestedMenu(elsNestedPanel);

    if (elNestedMenu) {
      elMenuItem.appendChild(elNestedMenu);
    }

    return elMenuItem;
  }

  insertMenu() {
    const bm = this;
    bm.elementTarget.insertBefore(bm.elMenu, bm.elementTarget.firstChild);
  }
}
