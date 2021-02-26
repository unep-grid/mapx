import {diff, clone} from 'jsondiffpatch';
/**
 * Update settings
 * @param {Options} o Option with key from settings. Overwrite settings values.
 */
export function updateSettings(o) {
  const h = mx.helpers;
  const oldSettings = clone(mx.settings);
  h.mergeDeep(mx.settings, o);
  const delta = diff(oldSettings, mx.settings);
  mx.events.fire({
    type: 'settings_change',
    data: {
      delta: delta,
      old_settings: oldSettings,
      new_settings: mx.settings
    }
  });
  const userChange = diff(oldSettings.user, mx.settings.user);
  if (userChange) {
    mx.events.fire({
      type: 'settings_user_change',
      data: {
        delta: userChange,
        old_user: oldSettings.user,
        new_user: mx.settings.user
      }
    });
  }
  const projectChange = diff(oldSettings.project.id, mx.settings.project.id);

  if (projectChange) {
    mx.events.fire({
      type: 'settings_project_change',
      data: {
        delta: projectChange,
        old_project: oldSettings.project.id,
        new_project: mx.settings.project.id
      }
    });
  }
}
