const pgTypesData = {
  text: { json: "string", handsontable: "text", mx_handsontable: "mx_string" },
  jsonb: { json: "object", handsontable: "text", mx_handsontable: "mx_jsonb" },
  date: { json: "string", handsontable: "text", mx_handsontable: "mx_string" },
  numeric: {
    json: "number",
    handsontable: "numeric",
    mx_handsontable: "mx_number",
  },
  integer: {
    json: "number",
    handsontable: "numeric",
    mx_handsontable: "mx_number",
  },
  boolean: {
    json: "boolean",
    handsontable: "checkbox",
    mx_handsontable: "mx_boolean",
  },
  bigint: {
    json: "number",
    handsontable: "numeric",
    mx_handsontable: "mx_number",
  },
  "double precision": {
    json: "number",
    handsontable: "numeric",
    mx_handsontable: "mx_number",
  },
  real: {
    json: "number",
    handsontable: "numeric",
    mx_handsontable: "mx_number",
  },
  smallint: {
    json: "number",
    handsontable: "numeric",
    mx_handsontable: "mx_number",
  },
  "character varying": {
    json: "string",
    handsontable: "text",
    mx_handsontable: "mx_string",
  },
  "time with time zone": {
    json: "string",
    handsontable: "text",
    mx_handsontable: "mx_string",
  },
  "time without time zone": {
    json: "string",
    handsontable: "text",
    mx_handsontable: "mx_string",
  },
  "timestamp with time zone": {
    json: "string",
    handsontable: "text",
    mx_handsontable: "mx_string",
  },
  "timestamp without time zone": {
    json: "string",
    handsontable: "text",
    mx_handsontable: "mx_string",
  },
};

export { pgTypesData };
