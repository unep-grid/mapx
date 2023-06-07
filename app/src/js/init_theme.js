import { Theme } from "./theme";
import { getQueryParameter } from "./url_utils";
import { settings } from "./settings";
/**
 * Set theme
 */
const queryIdTheme = getQueryParameter("theme")[0];
const queryColors = getQueryParameter(["colors", "style"])[0];
const colors = queryIdTheme ? null : queryColors;
const storageIdTheme = localStorage.getItem("theme@id");
const idTheme = queryIdTheme || storageIdTheme;

const theme = new Theme({
  id: idTheme,
  colors: colors || settings.ui.colors,
});

export { theme };

if (!colors) {
  /**
   * Auto
   */
  initMatchMedia(theme).catch((e) => {
    console.warn(e);
  });
}

/*
 * Init match media query + listener
 */
async function initMatchMedia(theme) {
  try {
    if (idTheme !== "auto") {
      return;
    }
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
      await theme.set("classic_dark");
    }
    wMdark.addEventListener("change", async (e) => {
      return e.matches && (await theme.set("classic_dark"));
    });
    wMlight.addEventListener("change", async (e) => {
      return e.matches && (await theme.set("classic_light"));
    });
  } catch (e) {
    console.warn(e);
  }
}
