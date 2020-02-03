/**
 * Update settings
 * @param {Options} o Option with key from settings. Overwrite settings values.
 */
export function updateSettings(o) {
  Object.assign(mx.settings,o);
}

/**
 * Settings of the user
 * @param {Object} o Object that contains user data such as id, email, nickname, etc..
 */
export function updateSettingsUser(o) {
  Object.assign(mx.settings.user, o);
}
