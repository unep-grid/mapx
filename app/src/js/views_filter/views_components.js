import { settings } from "../settings";
import { path } from "../mx_helper_misc.js";
import { isNotEmpty } from "../is_test";

export function setViewsComponents(views) {
  for (const v of views) {
    const componentGroups = {
      types: [],
      features: [],
      rights: [],
    };
    const { type, data, project, _edit } = v;
    const isVt = type === "vt";
    const isSm = type === "sm";
    const isCc = type === "cc";
    const isRt = type === "rt";
    const isGj = type === "gj";
    const widgets = path(data, "dashboard.widgets", []);
    const storySteps = path(data, "story.steps", []);
    const overlap = path(data, "source.layerInfo.maskName", "");
    const attributes = path(data, "attribute.names", []);
    const customStyle = path(data, "style.custom", {});
    const readers = path(v, "readers", []);
    const local = project === settings.project.id;
    const editable = _edit === true;
    const isPublic = readers.includes("public");

    // View Types
    if (isVt) {
      componentGroups.types.push("vt");
    }
    if (isGj) {
      componentGroups.types.push("gj");
    }
    if (isRt) {
      componentGroups.types.push("rt");
    }
    if (isSm && isNotEmpty(storySteps)) {
      componentGroups.types.push("sm");
    }
    if (isCc) {
      componentGroups.types.push("custom_code");
    }

    // Features
    if (isNotEmpty(widgets)) {
      componentGroups.features.push("dashboard");
    }
    if (isVt && attributes && attributes.includes("mx_t0")) {
      componentGroups.features.push("time_slider");
    }
    if (isVt && typeof overlap === "string" && overlap.length > 0) {
      componentGroups.features.push("overlap");
    }
    if (isVt && customStyle?.json && JSON.parse(customStyle.json).enable) {
      componentGroups.features.push("custom_style");
    }

    // Rights
    componentGroups.rights.push(isPublic ? "view_public" : "view_non_public");
    componentGroups.rights.push(
      editable && local ? "view_editable" : "view_non_editable",
    );
    componentGroups.rights.push(local ? "view_local" : "view_non_local");

    v._components = [
      ...componentGroups.types,
      ...componentGroups.features,
      ...componentGroups.rights,
    ];
    v._component_groups = componentGroups;
  }
}
