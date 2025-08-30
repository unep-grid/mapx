import { Theme } from "./theme";
import { getQueryParameter } from "./url_utils";
/**
 * Set theme
 * - color or url theme for static mode
 * - app mode, the project will be the theme set in config
 */
const queryIdTheme = getQueryParameter("theme")[0];
const queryColors = getQueryParameter(["colors", "style"])[0];
const colors = queryIdTheme ? null : queryColors;
const idTheme = queryIdTheme;

export const theme = new Theme({
  id: idTheme,
  colors: colors,
});


