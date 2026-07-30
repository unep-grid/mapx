// @ts-check
import { settings } from "../../settings";
import { getDictItem, getDictTemplate } from "../../language";
import { pickSources } from "../picker/index.js";
import { wsGetSourcesList } from "../utils/index.js";

const MAX_TABLE_ROWS = 100000;
const MAX_TABLE_COLUMNS = 200;

/**
 * @param {{root: HTMLElement}} options
 * @returns {Promise<string | null>}
 */
export async function pickEditableTableSource({ root }) {
  const numberFormatter = new Intl.NumberFormat(settings.language);
  const [
    label,
    invalidSelection,
    unavailableTable,
    unavailableDimensions,
    excessiveDimensions,
  ] = await Promise.all([
    getDictItem("source_select_layer", settings.language),
    getDictItem("edit_table_picker_invalid_selection", settings.language),
    getDictItem("edit_table_picker_unavailable_table", settings.language),
    getDictItem("edit_table_picker_unavailable_dimensions", settings.language),
    getDictTemplate(
      "edit_table_picker_excessive_dimensions",
      {
        max_rows: numberFormatter.format(MAX_TABLE_ROWS),
        max_columns: numberFormatter.format(MAX_TABLE_COLUMNS),
      },
      settings.language,
    ),
  ]);
  const messages = {
    invalidSelection,
    unavailableTable,
    unavailableDimensions,
    excessiveDimensions,
  };
  const result = await pickSources({
    root,
    multiple: false,
    acceptedTypes: ["vector", "tabular"],
    requiredCapabilities: [],
    accessMode: "editable",
    language: settings.language,
    label,
    validateSelection: (selection) =>
      validateTableSelection(selection, messages),
  });
  return typeof result?.value === "string" ? result.value : null;
}

/**
 * @param {{value: string | string[]}} selection
 * @param {{
 *   invalidSelection: string,
 *   unavailableTable: string,
 *   unavailableDimensions: string,
 *   excessiveDimensions: string
 * }} messages
 */
async function validateTableSelection({ value }, messages) {
  if (typeof value !== "string") {
    return { valid: false, message: messages.invalidSelection };
  }
  const response = await wsGetSourcesList({
    idSources: [value],
    types: ["vector", "tabular"],
    editable: true,
    readable: false,
    add_global: false,
    add_views: false,
    include_dimensions: true,
  });
  const source = response?.list?.find((item) => item?.id === value);
  if (!source || source.exists !== true) {
    return {
      valid: false,
      message: messages.unavailableTable,
    };
  }
  if (
    source.nrow === null ||
    source.nrow === undefined ||
    source.ncol === null ||
    source.ncol === undefined
  ) {
    return {
      valid: false,
      message: messages.unavailableDimensions,
    };
  }
  const rows = Number(source.nrow);
  const columns = Number(source.ncol);
  if (!Number.isFinite(rows) || !Number.isFinite(columns)) {
    return {
      valid: false,
      message: messages.unavailableDimensions,
    };
  }
  if (rows > MAX_TABLE_ROWS || columns > MAX_TABLE_COLUMNS) {
    return {
      valid: false,
      message: messages.excessiveDimensions,
    };
  }
  return { valid: true };
}
