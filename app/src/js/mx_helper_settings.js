import {diff, clone} from 'jsondiffpatch';
/**
 * Update settings
 * @param {Options} o Option with key from settings. Overwrite settings values.
 */
export function updateSettings(o) {
  const h = mx.helpers;
  const oldSettings = clone(mx.settings);
  h.mergeDeep(mx.settings,o);  
  const delta = diff(oldSettings,mx.settings);
  mx.events.fire({
    type: 'settings_change',
    data: {
      delta : delta,
      old_settings: oldSettings,
      new_settings: mx.settings
    }
  });
}

