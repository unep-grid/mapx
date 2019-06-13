/**
 * Switch user :)
 *
 * @param {Object} opt Options
 * @param {Number} opt.id Id of the target user
 *
 */
export function switchUser(opt) {
  if (window.Shiny) {
    if (!opt) {
      opt = {};
    }
    if (typeof opt === 'number') {
      opt = {
        id: opt
      };
    }
    Shiny.onInputChange('switchUser', opt);
  }
}
