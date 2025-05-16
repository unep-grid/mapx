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

export const theme = new Theme({
  id: idTheme,
  colors: colors || settings.ui.colors,
});
