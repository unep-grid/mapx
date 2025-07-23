const pgTypesData = {
  text: {
    json: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  jsonb: {
    json: "object",
    table_editor: "text",
    mx: "mx_jsonb",
  },
  date: {
    json: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  numeric: {
    json: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  integer: {
    json: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  boolean: {
    json: "boolean",
    table_editor: "checkbox",
    mx: "mx_boolean",
  },
  bigint: {
    json: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  ARRAY: {
    json: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  "double precision": {
    json: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  real: {
    json: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  smallint: {
    json: "number",
    table_editor: "numeric",
    mx: "mx_number",
  },
  "character varying": {
    json: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  "time with time zone": {
    json: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  "time without time zone": {
    json: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  "timestamp with time zone": {
    json: "string",
    table_editor: "text",
    mx: "mx_string",
  },
  "timestamp without time zone": {
    json: "string",
    table_editor: "text",
    mx: "mx_string",
  },
};

export { pgTypesData };
