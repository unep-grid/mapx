import {Theme} from './theme';
import {getQueryParameter} from './mx_helper_url.js';
/**
 * Set theme
 */
const queryIdTheme = getQueryParameter('theme')[0];
const queryColors = getQueryParameter(['colors', 'style'])[0];
const colors = queryIdTheme ? null : queryColors;

mx.theme = new Theme({
  idTheme: queryIdTheme,
  colors: colors || mx.settings.ui.colors
});

if (!colors) {
  /**
   * Auto
   */
  initMatchMedia(mx.theme);
}


/*
 * Init match media query + listener
 */
function initMatchMedia(theme) {
  try {
    const valid = theme instanceof Theme;
    if (!valid) {
      return;
    }
    /**
     * theme color auto
     */
    const wMdark = window.matchMedia('(prefers-color-scheme: dark)');
    const wMlight = window.matchMedia('(prefers-color-scheme: light)');

    if (wMdark.matches) {
      theme.setColorsByThemeId('smartgray');
    }
    wMdark.addEventListener('change', (e) => {
      return e.matches && theme.setColorsByThemeId('smartgray');
    });
    wMlight.addEventListener('change', (e) => {
      return e.matches && theme.setColorsByThemeId('mapx');
    });
  } catch (e) {
    console.warn(e);
  }
}
