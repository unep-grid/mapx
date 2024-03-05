import { diff, clone } from "jsondiffpatch";
import { settings } from "./settings";
//import { mergeDeep } from "./mx_helper_misc.js";

/**
 * Update settings
 * @param {Options} o Option with key from settings. Overwrite settings values.
 */
export function updateSettings(newSettings) {
  const oldSettings = clone(settings);

  /**
   * Simple reassign
   * - mergeDeep filled also translated value, such as project :
   *   a project in french was reported in the next project if the
   *   project had no project translation
   */
  Object.assign(settings, newSettings);

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
