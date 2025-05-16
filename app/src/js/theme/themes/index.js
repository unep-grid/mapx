import { default as color_dark } from "./color_dark.json";
import { default as color_light } from "./color_light.json";
import { default as tree_light } from "./tree_light.json";
import { default as tree_dark } from "./tree_dark.json";
import { default as water_light } from "./water_light.json";
import { default as water_dark } from "./water_dark.json";
import { default as classic_light } from "./classic_light.json";
import { default as classic_dark } from "./classic_dark.json";

export const themes = {
  color_light,
  color_dark,
  water_dark,
  water_light,
  tree_dark,
  tree_light,
  classic_dark,
  classic_light,
};

const def = {
  tree: true,
  water: true,
  dark: false,
};

export const custom_themes = [];

/**
 * Register custom themes
 * @param {Array<Object>} newThemes - Array of theme objects to register
 */
export function registerCustomThemes(newThemes) {
  if (!Array.isArray(newThemes)) {
    console.warn("registerCustomThemes expects an array of themes");
    return;
  }
  
  // Clear existing custom themes
  clearCustomThemes();
  
  // Add new themes
  newThemes.forEach(theme => {
    if (theme && theme.id) {
      custom_themes.push(theme);
    }
  });
}

/**
 * Clear all custom themes
 * Called when switching projects or when themes need to be refreshed
 */
export function clearCustomThemes() {
  custom_themes.length = 0;
}

/**
 * Resolve theme based on criteria
 * Prioritizes custom themes over built-in themes
 */
export function resolver(opt) {
  // First check custom themes
  const cthemes = custom_themes.filter((theme) => {
    return filterTheme(theme, opt);
  });
  const nThemes = cthemes.length;
  if (nThemes > 0) {
    if (nThemes > 1) {
      console.warn("More than one custom theme found, returning first");
    }
    return cthemes[0];
  }

  // Then check built-in themes
  for (const theme of Object.values(themes)) {
    if (filterTheme(theme, opt)) {
      return theme;
    }
  }
  console.warn("Theme not found, returning default");
  return themes.color_light;
}

function filterTheme(theme, opt) {
  const { tree, water, dark } = Object.assign({}, def, opt);
  if (theme.tree === tree && theme.dark === dark && theme.water === water) {
    return theme;
  }
}

export function inverseResolver(themeId) {
  const theme = themes[themeId];
  if (!theme) {
    return def;
  }
  const { tree, dark, water } = theme;
  return { tree, dark, water };
}
