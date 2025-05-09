import { modalSimple } from "../mx_helper_modal";
import { settings } from "../settings";
import "./style.less";
import { el } from "../el_mapx";
import { formatDate } from "../mx_helper_misc";

export async function showProjectInfo() {
  const elInfo = renderProjectInfo(settings.project);

  modalSimple({
    title: "Project info",
    content: elInfo,
    addBackground: true,
  });
}

/**
 * Renders project information into a clean UI component
 * @param {Function} el - Element creation function
 * @param {Object} data - Project data object
 * @param {string} language - Language code (default: 'en')
 * @returns {HTMLElement} - Rendered element
 */
function renderProjectInfo(data, language = "en") {
  // Helper function to get localized text with fallback
  function getText(textObj, fallback = "") {
    if (!textObj) return fallback;
    if (textObj[language] && textObj[language].trim()) return textObj[language];

    // Try to find any non-empty string in other languages
    const availableLangs = Object.keys(textObj);
    for (const lang of availableLangs) {
      if (textObj[lang] && textObj[lang].trim()) return textObj[lang];
    }

    return fallback;
  }
  // Create a simple badge
  function createBadge(text, className = "") {
    return el(
      "span",
      {
        class: ["badge", className],
      },
      text,
    );
  }

  // Get title and description
  const title = getText(data.title, "Untitled Project");
  const description = getText(data.description, "");

  // Create header with logo
  const header = el("div", { class: ["panel-heading"] }, [
    el("div", { class: ["row"] }, [
      // Logo column
      el("div", { class: ["col-md-2", "col-sm-3"] }, [
        el(
          "div",
          {
            class: ["project-logo"],
          },
          data.logo,
        ),
      ]),

      // Title and info column
      el("div", { class: ["col-md-10", "col-sm-9"] }, [
        el("h3", { class: ["project-title"] }, title),
        el("p", { class: ["project-description"] }, description),
        el("div", { class: ["project-id"] }, [
          el("small", [
            el("i", { class: ["fa", "fa-fingerprint", "fa-fw"] }),
            " ",
            data.id,
            data.alias ? el("span", [" (", data.alias, ")"]) : null,
          ]),
        ]),
      ]),
    ]),
  ]);

  // Create status section
  const statusSection = el("div", { class: ["panel-body"] }, [
    el("div", { class: ["row"] }, [
      // Status indicators
      el("div", { class: ["col-md-6"] }, [
        el("ul", { class: ["list-unstyled"] }, [
          // Active status
          el("li", [
            el("i", {
              class: [
                "fa",
                data.active ? "fa-check-circle" : "fa-times-circle",
                "fa-fw",
              ],
              style: { color: data.active ? "#5cb85c" : "#d9534f" },
            }),
            " Status: ",
            createBadge(
              data.active ? "Active" : "Inactive",
              data.active ? "badge-success" : "badge-danger",
            ),
          ]),

          // Public status
          el("li", [
            el("i", {
              class: ["fa", data.public ? "fa-globe" : "fa-lock", "fa-fw"],
              style: { color: data.public ? "#5bc0de" : "#f0ad4e" },
            }),
            " Visibility: ",
            createBadge(
              data.public ? "Public" : "Private",
              data.public ? "badge-info" : "badge-warning",
            ),
          ]),

          // Theme
          el("li", [
            el("i", { class: ["fa", "fa-paint-brush", "fa-fw"] }),
            " Theme: ",
            createBadge(data.theme),
          ]),

          // Dates
          el("li", [
            el("i", { class: ["fa", "fa-calendar", "fa-fw"] }),
            " Created: ",
            formatDate(data.date_created),
          ]),
          el("li", [
            el("i", { class: ["fa", "fa-calendar-plus-o", "fa-fw"] }),
            " Modified: ",
            formatDate(data.date_modified),
          ]),
        ]),
      ]),

      // Counts
      el("div", { class: ["col-md-6"] }, [
        el("div", { class: ["row"] }, [
          // Admins
          el("div", { class: ["col-xs-6", "col-md-4"] }, [
            el("div", { class: ["count-box"] }, [
              el("div", { class: ["count-value"] }, data.admins || 0),
              el("div", { class: ["count-label"] }, [
                el("i", { class: ["fa", "fa-user-secret", "fa-fw"] }),
                " Admins",
              ]),
            ]),
          ]),

          // Members
          el("div", { class: ["col-xs-6", "col-md-4"] }, [
            el("div", { class: ["count-box"] }, [
              el(
                "div",
                { class: ["count-value"] },
                Array.isArray(data.members) ? data.members.length : 0,
              ),
              el("div", { class: ["count-label"] }, [
                el("i", { class: ["fa", "fa-users", "fa-fw"] }),
                " Members",
              ]),
            ]),
          ]),

          // Publishers
          el("div", { class: ["col-xs-6", "col-md-4"] }, [
            el("div", { class: ["count-box"] }, [
              el(
                "div",
                { class: ["count-value"] },
                Array.isArray(data.publishers) ? data.publishers.length : 0,
              ),
              el("div", { class: ["count-label"] }, [
                el("i", { class: ["fa", "fa-upload", "fa-fw"] }),
                " Publishers",
              ]),
            ]),
          ]),

          // External views
          el("div", { class: ["col-xs-6", "col-md-6"] }, [
            el("div", { class: ["count-box"] }, [
              el(
                "div",
                { class: ["count-value"] },
                Array.isArray(data.views_external)
                  ? data.views_external.length
                  : 0,
              ),
              el("div", { class: ["count-label"] }, [
                el("i", { class: ["fa", "fa-eye", "fa-fw"] }),
                " External Views",
              ]),
            ]),
          ]),

          // State views
          el("div", { class: ["col-xs-6", "col-md-6"] }, [
            el("div", { class: ["count-box"] }, [
              el(
                "div",
                { class: ["count-value"] },
                Array.isArray(data.states_views) ? data.states_views.length : 0,
              ),
              el("div", { class: ["count-label"] }, [
                el("i", { class: ["fa", "fa-map", "fa-fw"] }),
                " State Views",
              ]),
            ]),
          ]),
        ]),
      ]),
    ]),
  ]);

  // Organization info
  const orgSection = data.org_name
    ? el("div", { class: ["panel-body", "border-top"] }, [
        el("h4", [
          el("i", { class: ["fa", "fa-building", "fa-fw"] }),
          " Organization",
        ]),
        el("ul", { class: ["list-unstyled"] }, [
          el("li", [el("strong", "Name: "), data.org_name]),
          data.org_contact_name
            ? el("li", [el("strong", "Contact: "), data.org_contact_name])
            : null,
          data.org_contact_email
            ? el("li", [
                el("strong", "Email: "),
                el(
                  "a",
                  { href: `mailto:${data.org_contact_email}` },
                  data.org_contact_email,
                ),
              ])
            : null,
        ]),
      ])
    : null;

  // Countries
  const countriesSection =
    data.countries && data.countries.length > 0
      ? el("div", { class: ["panel-body", "border-top"] }, [
          el("h4", [
            el("i", { class: ["fa", "fa-globe", "fa-fw"] }),
            " Countries",
          ]),
          el(
            "div",
            { class: ["countries-list"] },
            data.countries.map((country) =>
              createBadge(country, "badge-primary"),
            ),
          ),
        ])
      : null;

  // Combine all sections into the final panel
  return el(
    "div",
    { class: ["panel", "panel-default", "project-info-panel"] },
    [header, statusSection, orgSection, countriesSection],
  );
}
