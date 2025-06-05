import { translate } from "#mapx/language";

export function getSchema(language = "en", full = true) {
  function t(id) {
    return translate(id, language);
  }

  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $async: true,
    title: t("mx_theme_schema_title"),
    description: t("mx_theme_schema_description"),
    type: "object",
    properties: {
      id: {
        type: "string",
        minLength: 3,
        maxLength: 40,
        pattern: "^[a-z_0-9]+$",
        title: t("mx_theme_manager_id"),
        description: t("mx_theme_id_description"),
      },
      description: {
        type: "object",
        title: t("mx_theme_manager_description"),
        description: t("mx_theme_description_description"),
        properties: {
          en: {
            type: "string",
            minLength: 10,
            maxLength: 100,
          },
        },
        required: ["en"],
      },
      label: {
        type: "object",
        title: t("mx_theme_label_title"),
        description: t("mx_theme_label_description"),
        properties: {
          en: {
            type: "string",
            minLength: 3,
            maxLength: 40,
          },
        },
        required: ["en"],
      },
      dark: {
        type: "boolean",
        format: "checkbox",
        title: t("mx_theme_manager_dark"),
        description: t("mx_theme_dark_description"),
      },
      tree: {
        type: "boolean",
        format: "checkbox",
        title: t("mx_theme_manager_tree"),
        description: t("mx_theme_tree_description"),
      },
      water: {
        type: "boolean",
        format: "checkbox",
        title: t("mx_theme_manager_water"),
        description: t("mx_theme_water_description"),
      },
      colors: {
        type: "object",
        title: t("mx_theme_colors_title"),
        additionalProperties: false,
        properties: {
          mx_ui_highlighter: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_highlighter"),
          },
          mx_ui_text: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_text"),
          },
          mx_ui_link: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_link"),
          },
          mx_ui_input_accent: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_input_accent"),
          },
          mx_ui_text_faded: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_text_faded"),
          },
          mx_ui_hidden: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_hidden"),
          },
          mx_ui_border: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_border"),
          },
          mx_ui_background: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_background"),
          },
          mx_ui_background_accent: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_background_accent"),
          },
          mx_ui_background_faded: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_background_faded"),
          },
          mx_ui_background_contrast: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_background_contrast"),
          },
          mx_ui_background_transparent: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_background_transparent"),
          },
          mx_ui_shadow: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_ui_shadow"),
          },
          mx_map_background: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_background"),
          },
          mx_map_feature_highlight: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_feature_highlight"),
          },
          mx_map_hillshade_shadow: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_hillshade_shadow"),
          },
          mx_map_hillshade_highlight: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_hillshade_highlight"),
          },
          mx_map_mask: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_mask"),
          },
          mx_map_text_place: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_place"),
          },
          mx_map_text_road: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_road"),
          },
          mx_map_text_water: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_water"),
          },
          mx_map_text_water_outline: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_water_outline"),
          },
          mx_map_water: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_water"),
          },
          mx_map_bathymetry_high: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_bathymetry_high"),
          },
          mx_map_bathymetry_low: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_bathymetry_low"),
          },
          mx_map_bathymetry_lines: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_bathymetry_lines"),
          },
          mx_map_road: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_road"),
          },
          mx_map_road_border: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_road_border"),
          },
          mx_map_building: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_building"),
          },
          mx_map_building_border: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_building_border"),
          },
          mx_map_boundary_un_1: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_boundary_un_1"),
          },
          mx_map_boundary_un_2: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_boundary_un_2"),
          },
          mx_map_boundary_un_3: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_boundary_un_3"),
          },
          mx_map_boundary_un_4: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_boundary_un_4"),
          },
          mx_map_boundary_un_8: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_boundary_un_8"),
          },
          mx_map_boundary_un_9: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_boundary_un_9"),
          },
          mx_map_boundary_un_6: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_boundary_un_6"),
          },
          mx_map_text_land_outline: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_land_outline"),
          },
          mx_map_text_bathymetry_outline: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_bathymetry_outline"),
          },
          mx_map_text_bathymetry: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_bathymetry"),
          },
          mx_map_text_country_0_0: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_country_0_0"),
          },
          mx_map_text_country_0_1: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_country_0_1"),
          },
          mx_map_text_country_0_2: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_country_0_2"),
          },
          mx_map_text_country_0_3: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_country_0_3"),
          },
          mx_map_text_country_0_4: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_country_0_4"),
          },
          mx_map_text_country_0_5: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_country_0_5"),
          },
          mx_map_text_country_0_99: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_country_0_99"),
          },
          mx_map_text_country_1_1: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_country_1_1"),
          },
          mx_map_rail: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_rail"),
          },
          mx_map_vegetation: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_vegetation"),
          },
          mx_map_zone_commercial: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_zone_commercial"),
          },
          mx_map_snow: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_snow"),
          },
          mx_map_contour_lines: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_contour_lines"),
          },
          mx_map_text_contour: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_contour"),
          },
          mx_map_text_contour_outline: {
            $ref: "#/definitions/colorProperty",
            title: t("mx_map_text_contour_outline"),
          },
        },
      },
    },
    definitions: {
      colorProperty: {
        type: "object",
        properties: {
          visibility: {
            type: "string",
            enum: ["visible", "none"],
            title: t("mx_theme_input_checkbox"),
          },
          color: {
            type: "string",
            pattern:
              "^rgba?\\((\\d{1,3}),\\s?(\\d{1,3}),\\s?(\\d{1,3})(,\\s?((0(\\.\\d{1,2})?)|(1(\\.0{1,2})?)))?\\)$",
            title: t("mx_theme_input_color"),
          },
          font: {
            type: "string",
            title: t("mx_theme_input_font"),
          },
        },
        required: ["visibility", "color"],
        additionalProperties: false,
      },
    },
    required: ["id", "label", "description"],
  };

  if (full) {
    schema.required = [
      ...schema.required,
      "colors",
      "creator",
      "last_editor",
    ];
  } else {
    const keys = Object.keys(schema.properties);
    const req = schema.required;

    for (const key of keys) {
      if (!req.includes(key)) {
        delete schema.properties[key];
      }
    }
  }

  return { ...schema };
}
