import { el } from "../el_mapx";
import { isViewWms, isViewEditable } from "../is_test";
import { isViewDownloadableRemote } from "../map_helpers";
import { path } from "../mx_helper_misc";
import { settings } from "../settings";

export async function createViewControls(view) {
  const isDownloadable = await isViewDownloadableRemote(view);
  const isCurrentProject = settings.project.id === view.project;
  const isRegistered = !settings?.user?.guest;
  const isEditable = isViewEditable(view); //_edit flag
  const isSm = view.type === "sm";
  const isCc = view.type === "cc";
  const isVt = view.type === "vt";
  const isGj = view.type === "gj";
  const isRt = view.type === "rt";
  const isTemp = !!view._temp;
  const isRtWms = isViewWms(view);
  const geom = path(view, "data.geometry.type");
  const geomOk = isVt && ["point", "line", "polygon"].includes(geom);
  const isVtWithAttr = isVt && path(view, "data.attribute.name", true);
  const isVtWithGeom = isVt && isVtWithAttr && geomOk;
  const uIsDev = !!settings?.user?.roles?.developer;
  const uIsPublisher = !!settings?.user?.roles?.publisher;
  const uIsAdmin = !!settings?.user?.roles?.admin;
  const hasEditRight = isEditable && isCurrentProject && !isTemp;

  const controlItems = [];

  if (isSm) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_start_story", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_start_story",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-play" }),
        ),
      ),
    );
  }

  if (isSm && hasEditRight) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_edit_story", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_edit_story",
              view_action_handler: "shiny",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-file-text" }),
        ),
      ),
    );
  }

  if (isGj || isVtWithGeom || isRtWms) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_zoom_all", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_zoom_all",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-object-group" }),
        ),
      ),
    );
  }

  if (isGj || isVtWithGeom) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_zoom_visible", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_zoom_visible",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-binoculars" }),
        ),
      ),
    );
  }

  if (!isSm) {
    /**
     * The story map views are the only one where the reset does not make sense.
     */
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_reset", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_reset",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-undo" }),
        ),
      ),
    );
  }

  if (isGj || isVt || isRt) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_settings", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_settings",
              view_action_el_target: `mx-settings-tool-${view.id}`,
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-sliders" }),
        ),
      ),
    );
  }

  if (isRt || isCc || isVtWithAttr) {
    controlItems.push(
      el(
        "li",
        {
          class: `hint--top`,
          dataset: {
            lang_type: "tooltip",
            lang_key: isDownloadable
              ? "btn_opt_download"
              : "btn_opt_download_not_allowed",
          },
        },
        isDownloadable
          ? el(
              "button",
              {
                class: "btn-circle btn-circle-small",
                dataset: {
                  view_action_key:
                    isRt || isCc ? "btn_opt_get_external" : "btn_opt_download",
                  view_action_target: view.id,
                },
              },
              el("i", { class: "fa fa-cloud-download" }),
            )
          : el(
              "button",
              {
                class: "btn-circle btn-circle-small",
                disabled: true,
              },
              el("i", { class: "fa fa-cloud-download" }),
            ),
      ),
    );
  }

  if (isGj) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_download", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_get_geojson",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-cloud-download" }),
        ),
      ),
    );
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_delete_geojson", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_delete_geojson",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-trash-o" }),
        ),
      ),
    );
  }

  if (isVtWithAttr) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: {
            lang_key: "btn_opt_code_integration",
            lang_type: "tooltip",
          },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_code_integration",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-file-code-o" }),
        ),
      ),
    );
  }

  if (isGj && (uIsPublisher || uIsAdmin)) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_upload", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_upload_geojson",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-cloud-upload" }),
        ),
      ),
    );
  }

  if (isVtWithAttr) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: {
            lang_key: "btn_opt_attribute_table",
            lang_type: "tooltip",
          },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_attribute_table",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-table" }),
        ),
      ),
    );
  }

  if ((isVt || isRt || isCc || isSm) && hasEditRight) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_edit_config", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_edit_config",
              view_action_handler: "shiny",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-pencil" }),
        ),
      ),
    );
  }

  if ((isVt || isRt || isCc) && hasEditRight) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: {
            lang_key: uIsDev
              ? "btn_opt_edit_dashboard"
              : "action_not_allowed_dev",
            lang_type: "tooltip",
          },
        },
        uIsDev
          ? el(
              "button",
              {
                class: "btn-circle btn-circle-small",
                dataset: {
                  view_action_key: "btn_opt_edit_dashboard",
                  view_action_handler: "shiny",
                  view_action_target: view.id,
                },
              },
              el("i", { class: "fa fa-pie-chart" }),
            )
          : el(
              "button",
              {
                class: "btn-circle btn-circle-small",
                disabled: true,
              },
              el("i", { class: "fa fa-pie-chart" }),
            ),
      ),
    );
  }

  if (isCc && hasEditRight) {
    controlItems.push(
      el(
        "li",
        {
          class: `hint--top`,
          dataset: {
            lang_key: uIsDev
              ? "btn_opt_edit_custom_code"
              : "action_not_allowed_dev",
            lang_type: "tooltip",
          },
        },
        uIsDev
          ? el(
              "button",
              {
                class: "btn-circle btn-circle-small",
                dataset: {
                  view_action_key: "btn_opt_edit_custom_code",
                  view_action_handler: "shiny",
                  view_action_target: view.id,
                },
              },
              el("i", { class: "fa fa-terminal" }),
            )
          : el(
              "button",
              {
                class: "btn-circle btn-circle-small",
                disabled: true,
              },
              el("i", { class: "fa fa-terminal" }),
            ),
      ),
    );
  }

  if (isVtWithGeom && hasEditRight) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_edit_style", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_edit_style",
              view_action_handler: "shiny",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-paint-brush" }),
        ),
      ),
    );
  }

  if (hasEditRight)
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_delete", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_delete",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-trash-o" }),
        ),
      ),
    );

  if (isRegistered && (isSm || isVt || isRt || isCc)) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: {
            lang_key: "btn_opt_share_to_project",
            lang_type: "tooltip",
          },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_share_to_project",
              view_action_target: view.id,
              view_action_handler: "shiny",
            },
          },
          el("i", { class: "fa fa-share" }),
        ),
      ),
    );
  }

  if (!isCurrentProject) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_home_project", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_home_project",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-home" }),
        ),
      ),
    );
  }

  if (isTemp && uIsPublisher) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: {
            lang_key: "btn_opt_import_view_linked",
            lang_type: "tooltip",
          },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_import_view_linked",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-thumb-tack" }),
        ),
      ),
    );
  }

  if (isTemp) {
    controlItems.push(
      el(
        "li",
        {
          class: "hint--top",
          dataset: { lang_key: "btn_opt_remove_linked", lang_type: "tooltip" },
        },
        el(
          "button",
          {
            class: "btn-circle btn-circle-small",
            dataset: {
              view_action_key: "btn_opt_remove_linked",
              view_action_target: view.id,
            },
          },
          el("i", { class: "fa fa-unlink" }),
        ),
      ),
    );
  }

  return el(
    "div",
    { class: "mx-controls-view" },
    el("ul", { class: "mx-controls-ul" }, ...controlItems),
  );
}
