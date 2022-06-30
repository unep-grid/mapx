import { Theme } from "./theme";
import { getQueryParameter } from "./url_utils";
import { settings } from "./settings";
/**
 * Set theme
 */
const queryIdTheme = getQueryParameter("theme")[0];
const queryColors = getQueryParameter(["colors", "style"])[0];
const colors = queryIdTheme ? null : queryColors;

const theme = new Theme({
  idTheme: queryIdTheme,
  colors: colors || settings.ui.colors,
});

export { theme };

if (!colors) {
  /**
   * Auto
   */
  initMatchMedia(theme);
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
    const wMdark = window.matchMedia("(prefers-color-scheme: dark)");
    const wMlight = window.matchMedia("(prefers-color-scheme: light)");

    if (wMdark.matches) {
      theme.setColorsByThemeId("smartgray");
    }
    wMdark.addEventListener("change", (e) => {
      return e.matches && theme.setColorsByThemeId("smartgray");
    });
    wMlight.addEventListener("change", (e) => {
      return e.matches && theme.setColorsByThemeId("mapx");
    });
  } catch (e) {
    console.warn(e);
  }
}
