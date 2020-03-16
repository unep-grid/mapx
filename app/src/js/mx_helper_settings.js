/**
 * Update settings
 * @param {Options} o Option with key from settings. Overwrite settings values.
 */
export function updateSettings(o) {
  const oldSettings = Object.assign({}, mx.settings);
  Object.assign(mx.settings, o);
  const newSettings = Object.assign({}, mx.settings);

  mx.events.fire({
    type: 'settings_change',
    data: {
      new_settings: newSettings,
      old_settings: oldSettings
    }
  });
}

/**
 * Settings of the user
 * @param {Object} o Object that contains user data such as id, email, nickname, etc..
 */
export function updateSettingsUser(o) {
  const oldSettings = Object.assign({}, mx.settings.user);
  Object.assign(mx.settings.user, o);
  const newSettings = Object.assign({}, mx.settings.user);

  mx.events.fire({
    type: 'settings_user_change',
    data: {
      new_settings: newSettings,
      old_settings: oldSettings
    }
  });
}
