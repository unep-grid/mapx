import { diff, clone } from "jsondiffpatch";
import { settings } from "./settings";
import { mergeDeep } from "./mx_helper_utils_json";
/**
 * Update settings
 * @param {Options} o Option with key from settings. Overwrite settings values.
 */
export function updateSettings(o) {
  const oldSettings = clone(settings);

  mergeDeep(settings, o);

  const delta = diff(oldSettings, settings);

  mx.events.fire({
    type: "settings_change",
    data: {
      delta: delta,
      old_settings: oldSettings,
      new_settings: settings,
    },
  });

  const userChange = diff(oldSettings.user, settings.user);
  if (userChange) {
    mx.events.fire({
      type: "settings_user_change",
      data: {
        delta: userChange,
        old_user: oldSettings.user,
        new_user: settings.user,
      },
    });
  }
  const projectChange = diff(oldSettings.project, settings.project);

  if (projectChange) {
    mx.events.fire({
      type: "settings_project_change",
      data: {
        delta: projectChange,
        old_project: oldSettings?.project?.id,
        new_project: settings?.project?.id,
      },
    });
  }

}
