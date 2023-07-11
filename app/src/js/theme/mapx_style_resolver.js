import chroma from "chroma-js";
import { loadFontFace } from "./fonts";
import style from "./../../data/style/style_mapx.json";
import { isNotEmpty } from "../is_test";

export async function css_resolver(c) {
  const family = await font(c.mx_ui_text);
  return `
  * {
  --mx_ui_text: ${color(c.mx_ui_text)};
  --mx_ui_font_text: ${family};
  --mx_ui_text_faded: ${color(c.mx_ui_text_faded)};
  --mx_ui_hidden: ${color(c.mx_ui_hidden)};
  --mx_ui_border: ${color(c.mx_ui_border)};
  --mx_ui_background: ${color(c.mx_ui_background)};
  --mx_ui_background_faded: ${color(c.mx_ui_background_faded)};
  --mx_ui_background_contrast: ${color(c.mx_ui_background_contrast)};
  --mx_ui_background_accent: ${color(c.mx_ui_background_accent)};
  --mx_ui_background_transparent: ${color(c.mx_ui_background_transparent)};
  --mx_ui_shadow: ${color(c.mx_ui_shadow)};
  --mx_ui_link: ${color(c.mx_ui_link)};
  --mx_ui_input_accent: ${color(c.mx_ui_input_accent)};
  border-color: var(--mx_ui_border);
  color: var(--mx_ui_text);
}`;
}

export function layer_resolver(c) {
  /**
   * id = layers in main style
   * -> layout, paint = parameters to edit
   */
  return [
    {
      id: ["background"],
      layout: {
        visibility: c.mx_map_background.visibility,
      },
      paint: {
        "background-color": c.mx_map_background.color,
      },
    },

    {
      id: ["landuse_vegetation", "national_park", "landcover_vegetation"],
      layout: {
        visibility: c.mx_map_vegetation.visibility,
      },
      paint: {
        "fill-color": c.mx_map_vegetation.color,
      },
    },
    {
      id: ["landuse_commercial"],
      layout: {
        visibility: c.mx_map_zone_commercial.visibility,
      },
      paint: {
        "fill-color": c.mx_map_zone_commercial.color,
      },
    },
    {
      id: ["landuse_snow"],
      layout: {
        visibility: c.mx_map_snow.visibility,
      },
      paint: {
        "fill-color": c.mx_map_snow.color,
      },
    },
    {
      id: ["hillshading"],
      layout: {
        visibility: allVisible([
          c.mx_map_hillshade_shadow.visibility,
          c.mx_map_hillshade_highlight.visibility,
        ]),
      },
      paint: {
        "fill-color": [
          "match",
          ["get", "class"],
          "highlight",
          c.mx_map_hillshade_highlight.color,
          "shadow",
          c.mx_map_hillshade_shadow.color,
          "hsla(0, 0%, 0%, 0)",
        ],
      },
    },
    {
      id: ["water"],
      layout: {
        visibility: c.mx_map_water.visibility,
      },
      paint: {
        "fill-color": c.mx_map_water.color,
      },
    },
    {
      id: ["bathymetry"],
      layout: {
        visibility: allVisible([
          c.mx_map_bathymetry_low.visibility,
          c.mx_map_bathymetry_high.visibility,
        ]),
      },
      paint: {
        "fill-color": [
          "interpolate",
          ["cubic-bezier", 0, 0.5, 1, 0.5],
          ["get", "depth"],
          200,
          c.mx_map_bathymetry_high.color,
          9000,
          c.mx_map_bathymetry_low.color,
        ],
      },
    },
    {
      id: ["bathymetry-lines"],
      layout: {
        visibility: c.mx_map_bathymetry_lines.visibility,
      },
      paint: {
        "line-color": c.mx_map_bathymetry_lines.color,
      },
    },
    {
      id: ["bathymetry-label"],
      layout: {
        visibility: c.mx_map_text_bathymetry.visibility,
        "text-font": fontFallback(c.mx_map_text_bathymetry.font),
      },
      paint: {
        "text-color": c.mx_map_text_bathymetry.color,
      },
    },
    {
      id: ["waterway"],
      layout: {
        visibility: c.mx_map_water.visibility,
      },
      paint: {
        "line-color": c.mx_map_water.color,
      },
    },
    {
      id: ["country-code"],
      layout: {
        visibility: c.mx_map_mask.visibility,
      },
      paint: {
        "fill-color": c.mx_map_mask.color,
      },
    },
    {
      id: [
        "road_path_tunnel",
        "road_path",
        "road_path_bridge",
        "road_regular_tunnel",
        "road_regular",
        "road_regular_bridge",
        "road_motor_tunnel",
        "road_motor",
        "road_motor_bridge",
      ],
      layout: {
        visibility: c.mx_map_road.visibility,
      },
      paint: {
        "line-color": c.mx_map_road.color,
      },
    },
    {
      id: ["road_rail", "road_rail_ticks"],
      layout: {
        visibility: c.mx_map_rail.visibility,
      },
      paint: {
        "line-color": c.mx_map_rail.color,
      },
    },
    {
      id: ["road_pedestrian_polygon", "road_polygon"],
      layout: {
        visibility: c.mx_map_road.visibility,
      },
      paint: {
        "fill-color": c.mx_map_road.color,
      },
    },
    {
      id: [
        "road_path_tunnel_case",
        "road_path_case",
        "road_path_bridge_case",
        "road_regular_tunnel_case",
        "road_regular_case",
        "road_regular_bridge_case",
        "road_motor_tunnel_case",
        "road_motor_case",
        "road_motor_bridge_case",
      ],
      layout: {
        visibility: c.mx_map_road_border.visibility,
      },
      paint: {
        "line-color": c.mx_map_road_border.color,
      },
    },
    {
      id: ["building_extrusion"],
      paint: {
        "fill-extrusion-color": c.mx_map_building.color,
      },
    },
    {
      id: ["building"],
      layout: {
        visibility: c.mx_map_building.visibility,
      },
      paint: {
        "fill-color": c.mx_map_building.color,
      },
    },
   {
      id: ["building_border"],
      layout: {
        visibility: c.mx_map_building_border.visibility,
      },
      paint: {
        "line-color": c.mx_map_building_border.color,
      },
    },
    /**
     * BOUNDARIES
     */
    ...[1, 2, 3, 4, 8, 9, 6].map((i) => {
      return {
        id: [`boundary_un_${i}`],
        layout: {
          visibility: c[`mx_map_boundary_un_${i}`].visibility,
        },
        paint: {
          "line-color": c[`mx_map_boundary_un_${i}`].color,
        },
      };
    }),
    {
      id: ["place-label-capital", "place-label-city"],
      layout: {
        visibility: c.mx_map_text_place.visibility,
        "text-font": fontFallback(c.mx_map_text_place.font),
      },
      paint: {
        "text-color": c.mx_map_text_place.color,
        "icon-color": c.mx_map_text_place.color,
      },
    },
    /**
     * LABEL SUB COUNTRY LEVEL 1
     */
    ...[1].map((i) => {
      return {
        id: [`country_un_1_label_${i}`],
        layout: {
          visibility: c[`mx_map_text_country_1_${i}`].visibility,
          "text-font": fontFallback(c[`mx_map_text_country_1_${i}`].font),
        },
        paint: {
          "text-color": c[`mx_map_text_country_1_${i}`].color,
          "icon-color": c[`mx_map_text_country_1_${i}`].color,
        },
      };
    }),
    /**
     * LABEL COUNTRY LEVEL 0
     */
    ...[0, 1, 2, 3, 4, 5, 99].map((i) => {
      return {
        id: [`country_un_0_label_${i}`],
        layout: {
          visibility: c[`mx_map_text_country_0_${i}`].visibility,
          "text-font": fontFallback(c[`mx_map_text_country_0_${i}`].font),
        },
        paint: {
          "text-color": c[`mx_map_text_country_0_${i}`].color,
          "icon-color": c[`mx_map_text_country_0_${i}`].color,
        },
      };
    }),
    {
      id: ["water-label-line", "water-label-point"],
      layout: {
        visibility: c.mx_map_text_water.visibility,
        "text-font": fontFallback(c.mx_map_text_water.font),
      },
      paint: {
        "text-color": c.mx_map_text_water.color,
        "icon-color": c.mx_map_text_water.color,
      },
    },
    {
      id: ["road-label"],
      layout: {
        visibility: c.mx_map_text_road.visibility,
        "text-font": fontFallback(c.mx_map_text_road.font),
      },
      paint: {
        "text-color": c.mx_map_text_road.color,
      },
    },
    /**
     * OUTLINES
     * - Water
     * - Land
     * - Bathymetry
     */
    {
      id: ["water-label-line", "water-label-point"],
      paint: {
        "text-halo-color": c.mx_map_text_water_outline.color,
      },
    },
    {
      id: ["bathymetry-label"],
      paint: {
        "text-halo-color": c.mx_map_text_bathymetry_outline.color,
      },
    },
    {
      id: [
        "road-label",
        "place-label-capital",
        "place-label-city",
        "country_un_0_label_0",
        "country_un_0_label_1",
        "country_un_0_label_2",
        "country_un_0_label_3",
        "country_un_0_label_4",
        "country_un_0_label_5",
        "country_un_0_label_99",
        "country_un_1_label_1",
      ],
      paint: {
        "text-halo-color": c.mx_map_text_land_outline.color,
      },
    },
  ];
}

async function font(col) {
  if (col.font) {
    await loadFontFace(col.font);
  }
  return col.font || "system-ui";
}

function color(col) {
  const hide = !col.visibility || col.visibility !== "visible";
  const isStringCol = typeof col === "string";
  const color = isStringCol ? col : col.color;
  const chromaColor = chroma(color);
  if (hide) {
    return chromaColor.alpha(0).css();
  }
  const alpha = isStringCol || !col.alpha ? chromaColor.alpha() : col.alpha;
  return chromaColor.alpha(alpha).css();
}

function fontFallback(id) {
  const def = [
    "Noto Sans Regular",
    "Noto Sans Arabic Regular",
    "Noto Sans Bengali Regular",
  ];
  if (id) {
    def.unshift(id);
  }
  return def;
}

function allVisible(arr) {
  const v = arr.reduce((a, c) => {
    return a === true && c === "visible";
  }, true);
  return v ? "visible" : "none";
}
