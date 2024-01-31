import { elSpanTranslate, el } from "./../el_mapx";
import { cleanDiacritic } from "./../string_util/";
import { requestProjectMembership, setProject } from "../map_helpers/index.js";
import { getDictItem } from "../language";
import { settings } from "../settings";

const refs = {
  instance: null,
};

export class UserProjectsListRenderer {
  constructor(o) {
    if (refs.instance instanceof UserProjectsListRenderer) {
      refs.instance.destroy();
    }
    this.o = o;
    this.cnt = 0;
    this.dat = o.projects;
    this.idCol = o.idCol || this.dat.id ? "id" : "project";
    this.nRow = this.dat[this.idCol].length;
    this.titles = Object.keys(this.dat);
    this.nCol = this.titles.length;
    this.userIsGuest = settings.user.guest === true;
    this.elContainer = null;
    this.elSearchInput = null;
    this.elProjects = null;
    this.elsRows = [];
  }

  async render() {
    this.elDest = document.getElementById(this.o.idList);
    if (this.cnt++ < 5) {
      if (this.elDest) {
        await this.build();
        this.addToDest();
      } else {
        this.wait();
      }
    }
  }

  wait() {
    window.setTimeout(() => this.render(), 1);
  }

  addToDest() {
    this.elDest.appendChild(this.elContainer);
  }

  async build() {
    this.elContainer = el(
      "div",
      { class: "mx-list-projects-container" },
      (this.elSearchInput = el("input", { class: "mx-list-projects-search" })),
      (this.elProjects = el(
        "div",
        { class: "mx-list-projects" },
        (this.elsRows = [el("div")]),
      )),
    );

    await this.buildSearch();
    this.buildRows();
    this.listen();
  }

  detach() {
    mx.listeners.removeListenerByGroup("project_list");
  }

  destroy() {
    this.detach();
    this.elContainer.remove();
  }

  listen() {
    this.detach();
    mx.listeners.addListener({
      target: this.elSearchInput,
      bind: this,
      type: "keyup",
      idGroup: "project_list",
      callback: this.filterList,
      debounce: true,
      debounceTime: 100,
    });
    mx.listeners.addListener({
      target: this.elProjects,
      bind: this,
      type: ["click", "keydown"],
      idGroup: "project_list",
      callback: this.handleClick,
      debounce: true,
      debounceTime: 100,
    });
  }

  handleClick(e) {
    const el = e.target;
    const ds = el.dataset;
    if (e.type === "keydown" && e.key !== "Enter") {
      return;
    }

    const actions = {
      request_membership: () => {
        if (ds.allow_join === "true" && !this.userIsGuest) {
          requestProjectMembership(ds.request_membership);
        }
      },
      load_project: async () => {
        const done = await setProject(ds.load_project);
        if (done) {
          this.detach();
        }
      },
    };

    Object.keys(actions).forEach((a) => {
      if (ds[a]) {
        actions[a]();
      }
    });
  }

  filterList(e) {
    this.elProjects.classList.remove("mx-list-empty");
    let found = false;
    const textSearch = this.cleanString(e.target.value);
    for (const elRow of this.elsRows) {
      const textRow = elRow.dataset.text;
      if (!textRow) {
        continue;
      }
      const matched = textRow.match(textSearch);
      elRow.style.display = matched ? "block" : "none";
      if (!found && matched) {
        found = true;
      }
    }
    if (!found) {
      this.elProjects.classList.add("mx-list-empty");
    }
  }

  buildRows() {
    for (let i = 0; i < this.nRow; i++) {
      const row = this.titles.reduce((acc, title) => {
        acc[title] = this.dat[title][i];
        return acc;
      }, {});

      if (row.id !== settings.project.id) {
        const elRow = this.buildRow(row);
        this.elsRows.push(elRow);
        this.elProjects.appendChild(elRow);
      }
    }
  }

  async buildSearch() {
    this.elSearchInput.dataset.project_search = true;
    this.elSearchInput.placeholder = await getDictItem("project_search_values");
  }

  cleanString(str) {
    return cleanDiacritic(str.toLowerCase());
  }

  buildRow(row) {
    let elRowBadges;
    let elRow = el(
      "div",
      {
        class: "mx-list-projects-row",
        tabindex: 0,
        dataset: {
          text: this.cleanString(row.description + " " + row.title),
          load_project: row[this.idCol],
        },
      },
      el(
        "div",
        { class: "mx-list-projects-top" },
        el("h4", { class: "mx-list-projects-title" }, row.title),
        (elRowBadges = el("div", { class: "mx-list-project-opt" })),
      ),
      el(
        "div",
        { class: "mx-list-projects-bottom" },
        el(
          "div",
          { class: "mx-list-projects-left" },
          el("div", { class: "mx-list-projects-desc" }, row.description),
        ),
        el("div", { class: "mx-list-project-right" }),
      ),
    );

    this.makeBadges({ dat: row, elTarget: elRowBadges });

    return elRow;
  }

  makeBadges(opt) {
    let roleSet = false;
    const roles = ["admin", "publisher", "member"];
    const elBadgeContainer = el("div");
    opt.elTarget.appendChild(elBadgeContainer);
    roles.forEach((role) => {
      if (!roleSet && opt.dat[role]) {
        roleSet = true;
        const elBadgeMember = elSpanTranslate(role, { class: "mx-badge-role" });
        elBadgeContainer.appendChild(elBadgeMember);
      }
    });

    this.makeJoinButton({ dat: opt.dat, elTarget: opt.elTarget });
  }

  makeJoinButton(opt) {
    const allowJoin =
      !(opt.dat.member || opt.dat.admin || opt.dat.publisher) &&
      !this.userIsGuest;
    if (allowJoin) {
      const elBtn = el(
        "a",
        {
          href: "#",
          dataset: {
            request_membership: opt.dat[this.idCol],
            allow_join: opt.dat.allow_join,
          },
        },
        elSpanTranslate("btn_join_project"),
      );
      if (!opt.dat.allow_join) {
        elBtn.classList.add("mx-not-allowed");
      }
      opt.elTarget.appendChild(elBtn);
    }
  }
}
