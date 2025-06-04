import { modalSimple } from "../mx_helper_modal";
import { settings } from "../settings";
import "./style.less";
import { el, tt } from "../el_mapx";
import { lo } from "../language";
import { getArrayDistinct } from "../array_stat";
import { asArray } from "../mx_helper_misc";

export async function showProjectInfo() {
  const elInfo = renderProjectInfo(settings.project);
  const elTitle = tt("project_basic_info");
  modalSimple({
    title: elTitle,
    content: elInfo,
    addBackground: true,
  });
}

function renderProjectInfo(data) {
  const users = getArrayDistinct([
    ...asArray(data.admins),
    ...asArray(data.members),
    ...asArray(data.publishers),
  ]);

  const elOut = el("div", { class: "project-info" }, [
    el("div", { class: "well" }, [
      el("h3", el("span", lo(data.title))),
      el("p", el("span", lo(data.description))),
      el("div", { style: { maxWidth: "200px" } }, data.logo),
      el("h4", [
        el("span", { class: ["fa", "fa-briefcase"] }),
        el("span", " "),
        el("span", tt("project_org_details")),
      ]),
      el("dl", { class: ["dl-horizontal"] }, [
        el("dt", el("span", tt("project_org_name"))),
        el("dd", el("span", data.org_name)),

        el("dt", el("span", tt("project_contact_name"))),
        el("dd", el("span", data.org_contact_name)),

        el("dt", el("span", tt("project_contact_email"))),
        el("dd", [
          el("span", { class: ["fa", "fa-envelope"] }),
          el("span", " "),
          el(
            "a",
            { href: `mailto:${data.org_contact_email}` },
            el("span", data.org_contact_email),
          ),
        ]),
      ]),
    ]),

    el("hr"),

    // Project statistics
    el("div", { class: ["well"] }, [
      el("h4", [
        el("span", { class: ["fa", "fa-line-chart"] }),
        el("span", " "),
        el("span", tt("project_stats")),
      ]),
      el("dl", { class: ["dl-horizontal"] }, [
        el("dt", el("span", tt("project_users_count"))),
        el("dd", el("span", users.length.toString())),

        el("dt", el("span", tt("project_members_count"))),
        el("dd", el("span", asArray(data.members).length.toString())),

        el("dt", el("span", tt("project_publishers_count"))),
        el("dd", el("span", asArray(data.publishers).length.toString())),

        el("dt", el("span", tt("project_admins_count"))),
        el("dd", el("span", asArray(data.admins).length.toString())),

        el("dt", el("span", tt("project_date_created"))),
        el("dd", el("span", { class: ["text-muted"] }, data.date_created)),

        el("dt", el("span", tt("project_date_modified"))),
        el("dd", el("span", { class: ["text-muted"] }, data.date_modified)),
      ]),
    ]),

    el("hr"),

    // Terms of use
    el("div", { class: ["well"] }, [
      el("h4", [
        el("span", { class: ["fa", "fa-gavel"] }),
        el("span", " "),
        el("span", tt("project_terms_of_use")),
      ]),
      el(
        "p",
        { class: ["help-block"] },
        el("span", tt("project_terms_of_use_desc")),
      ),
      el("div", { class: ["alert", "alert-info"] }, [
        el("p", el("span", data.terms_of_use)),
      ]),
    ]),
  ]);

  return elOut;
}
