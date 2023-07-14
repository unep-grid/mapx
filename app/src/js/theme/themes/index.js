import copy from "fast-copy";

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

export function resolver(opt) {
  const { tree, water, dark } = Object.assign({}, def, opt);

  const key = [
    tree ? "tree" : "no_tree",
    water ? "water" : "no_water",
    dark ? "dark" : "light",
  ].join("_");

  const themeLookup = {
    tree_water_dark: themes.color_dark,
    tree_water_light: themes.color_light,
    tree_no_water_dark: themes.tree_dark,
    tree_no_water_light: themes.tree_light,
    no_tree_water_dark: themes.water_dark,
    no_tree_water_light: themes.water_light,
    no_tree_no_water_dark: themes.classic_dark,
    no_tree_no_water_light: themes.classic_light,
  };

  return themeLookup[key] || themes.color_light;
}

export function inverseResolver(themeId) {
  const themeLookup = {
    color_dark: { tree: true, water: true, dark: true },
    color_light: { tree: true, water: true, dark: false },
    tree_dark: { tree: true, water: false, dark: true },
    tree_light: { tree: true, water: false, dark: false },
    water_dark: { tree: false, water: true, dark: true },
    water_light: { tree: false, water: true, dark: false },
    classic_dark: { tree: false, water: false, dark: true },
    classic_light: { tree: false, water: false, dark: false },
  };

  return themeLookup[themeId] || null;
}
