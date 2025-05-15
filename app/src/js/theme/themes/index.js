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

export function resolver(opt) {
  const cthemes = custom_themes.filter((theme) => {
    return filterTheme(theme, opt);
  });
  const nThemes = cthemes.length;
  if (nThemes > 0) {
    if (nThemes > 1) {
      console.warn("More than one theme found,returning first");
    }
    return cthemes[0];
  }

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

