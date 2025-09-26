const pgTypesData = {
  text: {
    css: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  jsonb: {
    css: "object",
    table_editor: "text",
    mx: "mx_jsonb",
  },
  json: {
    css: "object",
    table_editor: "text",
    mx: "mx_json",
  },
  date: {
    css: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  numeric: {
    css: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  integer: {
    css: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  boolean: {
    css: "boolean",
    table_editor: "checkbox",
    mx: "mx_boolean",
  },
  bigint: {
    css: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  "double precision[]": {
    css: "array",
    table_editor: "text",
    mx: "mx_string",
  },
  "text[]": {
    css: "array",
    table_editor: "text",
    mx: "mx_string",
  },
  "double precision": {
    css: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  real: {
    css: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  smallint: {
    css: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  "character varying": {
    css: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  "time with time zone": {
    css: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  "time without time zone": {
    css: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  "timestamp with time zone": {
    css: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  "timestamp without time zone": {
    css: "string",
    table_editor: "text",
    mx: "mx_string",
  },
};

export { pgTypesData };
