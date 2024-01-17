import { translate } from "#mapx/language";

export function getSchema(language = "en") {
  function t(id) {
    return translate(id, language);
  }

  const schama = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $async: true,
    title: t("join_form_title"),
    description: t("join_form_title_desc"),
    type: "object",
    required: ["version", "id_source", "base", "joins"],
    additionalProperties: false,
    properties: {
      version: {
        type: "string",
        default: "1",
        options: {
          hidden: true,
        },
      },
      id_source: {
        type: "string",
        minLength: 1,
        options: {
          hidden: true,
        },
        mx_validate: {
          type: "source_registered",
        },
      },
      base: {
        type: "object",
        title: t("join_base"),
        required: ["id_source", "columns"],
        properties: {
          id_source: {
            title: t("join_source_base"),
            type: "string",
            minLength: 1,
            mx_validate: {
              type: "source_registered",
            },
            mx_options: {
              renderer: "tom-select",
              maxItems: 1,
              loader: "source",
              types: ["vector"],
              readable: true,
              add_global: true,
            },
          },
          columns: {
            title: t("join_columns_base"),
            type: "array",
            minItems: 0,
            maxItems: 50,
            items: {
              type: "string",
            },
            mx_validate: {
              type: "columns_exist",
              property: "id_source",
              path: "root.base",
            },
            mx_options: {
              renderer: "tom-select",
              maxItems: 50,
              loader: "source_columns",
              watch: {
                property: "id_source",
                path: "root.base",
              },
            },
          },
        },
      },
      joins: {
        title: t("join_joins"),
        type: "array",
        minItems: 1,
        maxItems: 30,
        items: {
          type: "object",
          required: [
            "id_source",
            "columns",
            "type",
            "column_join",
            "column_base",
          ],
          properties: {
            id_source: {
              title: t("join_source_join"),
              type: "string",
              minLength: 1,
              mx_validate: {
                type: "source_registered",
              },
              mx_options: {
                renderer: "tom-select",
                maxItems: 1,
                loader: "source_edit",
                types: ["vector", "tabular"],
                readable: true,
              },
            },
            columns: {
              title: t("join_columns_join"),
              type: "array",
              minItems: 1,
              items: {
                type: "string",
              },
              mx_validate: {
                type: "columns_exist",
                property: "id_source",
                path: ".",
              },
              mx_options: {
                renderer: "tom-select",
                maxItems: 10,
                loader: "source_edit_columns",
                watch: {
                  property: "id_source",
                  path: ".",
                },
              },
            },
            column_base: {
              title: t("join_column_base"),
              type: "string",
              minLength: 1,
              mx_validate: {
                type: "column_exists",
                property: "id_source",
                path: "root.base",
              },
              mx_options: {
                renderer: "tom-select",
                maxItems: 1,
                loader: "source_edit_columns",
                watch: {
                  property: "id_source",
                  path: "root.base",
                },
              },
            },
            type: {
              title: t("join_type"),
              type: "string",
              minLength: 1,
              enum: ["INNER", "LEFT", "RIGHT", "FULL"],
            },
            column_join: {
              title: t("join_column_join"),
              type: "string",
              minLength: 1,
              mx_validate: {
                type: "column_exists",
                property: "id_source",
                path: ".",
              },
              mx_options: {
                renderer: "tom-select",
                maxItems: 1,
                loader: "source_edit_columns",
                watch: {
                  property: "id_source",
                  path: ".",
                },
              },
            },
          },
        },
      },
    },
    mx_validate: {
      type: "valid_joins",
    },
  };
  return schama;
}
