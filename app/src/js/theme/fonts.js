import * as data from "../../fonts/files/font_cache.json";

const fontsData = data.default;
const fontFamiliesSet = new Set();
const fontsSet = new Set();

for (const font of fontsData) {
  fontFamiliesSet.add(font.family_name);
  fontsSet.add(`${font.family_name} ${font.style_name}`);
}

/**
 * TODO: Using fontFamilies from cache would be the best solution,
 * but some families have sub-family... So, We provide the main
 * families instead of the set
 */
//export const fontFamilies = Array.from(fontFamiliesSet);
export const fontFamilies = [
  "Libre Baskerville",
  "Noto Sans",
  "Roboto",
  "Varela Round",
  "Noto Sans",
  "Noto Sans Mono",
  "Roboto",
  "Varela Round",
  "Bangers",
  "Creepster",
];

export const fonts = Array.from(fontsSet);

export async function loadFontFace(family) {
  switch (family) {
    case "Noto Sans":
      import("../../fonts/css/Noto Sans.css");
      import("../../fonts/css/Noto Sans Arabic.css");
      import("../../fonts/css/Noto Sans Bengali.css");
      family = "Noto Sans,Noto Sans Arabic,Noto Sans Bengali";
      break;
    case "Libre Baskerville":
      import("../../fonts/css/Libre Baskerville.css");
      break;
    case "Noto Sans Mono":
      import("../../fonts/css/Noto Sans Mono.css");
      break;
    case "Roboto":
      import("../../fonts/css/Roboto.css");
      break;
    case "Varela Round":
      import("../../fonts/css/Varela Round.css");
    case "Bangers":
      import("../../fonts/css/Bangers.css");
    case "Creepster":
      import("../../fonts/css/Creepster.css");
  }
  return family;
}
