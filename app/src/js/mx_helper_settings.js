/**
 * Update settings
 * @param {Options} o Option with key from settings. Overwrite settings values.
 */
export function updateSettings(o) {
  var s = mx.settings;
  for (var i in o) {
    mx.settings[i] = o[i] || s[i];
  }
}

/**
 * Settings of the user
 * @param {Object} o Object that contains user data such as id, email, nickname, etc..
 */
export function updateSettingsUser(o) {
  for (var i in o) {
    mx.settings.user[i] = o[i];
  }
}
