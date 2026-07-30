import { beforeEach, describe, expect, it, vi } from "vitest";

const pickerMock = vi.hoisted(() => ({
  pickSources: vi.fn(),
  wsGetSourcesList: vi.fn(),
}));

vi.mock("../picker/index.js", () => ({
  pickSources: pickerMock.pickSources,
}));

vi.mock("../utils/index.js", () => ({
  wsGetSourcesList: pickerMock.wsGetSourcesList,
}));

vi.mock("../../settings", () => ({
  settings: { language: "fr" },
}));

vi.mock("../../language", () => ({
  getDictItem: vi.fn(async (key) => `translated:${key}`),
  getDictTemplate: vi.fn(async (key, data) => {
    return `translated:${key}:${data.max_rows}:${data.max_columns}`;
  }),
}));

import { pickEditableTableSource } from "./source_picker.js";

describe("table editor source picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an editable vector or tabular source ID", async () => {
    const root = document.createElement("div");
    pickerMock.pickSources.mockResolvedValue({
      value: "mx_tabular_a_b_c_d_e",
      items: [],
    });

    await expect(pickEditableTableSource({ root })).resolves.toBe(
      "mx_tabular_a_b_c_d_e",
    );
    expect(pickerMock.pickSources).toHaveBeenCalledWith({
      root,
      multiple: false,
      acceptedTypes: ["vector", "tabular"],
      requiredCapabilities: [],
      accessMode: "editable",
      language: "fr",
      label: "translated:source_select_layer",
      validateSelection: expect.any(Function),
    });
  });

  it("preserves the null cancellation contract", async () => {
    pickerMock.pickSources.mockResolvedValue(null);
    await expect(
      pickEditableTableSource({ root: document.createElement("div") }),
    ).resolves.toBeNull();
  });

  it("uses the localized invalid-selection message", async () => {
    pickerMock.pickSources.mockImplementation(async (options) => {
      await expect(
        options.validateSelection({ value: null, items: [] }),
      ).resolves.toEqual({
        valid: false,
        message: "translated:edit_table_picker_invalid_selection",
      });
      return null;
    });

    await pickEditableTableSource({ root: document.createElement("div") });
  });

  it.each([
    {
      name: "source removed or no longer editable",
      source: null,
    },
    {
      name: "missing physical table",
      source: { id: "mx_vector_a_b_c_d_e", exists: false, nrow: 0, ncol: 0 },
    },
    {
      name: "too many rows",
      source: {
        id: "mx_vector_a_b_c_d_e",
        exists: true,
        nrow: 100001,
        ncol: 10,
      },
    },
    {
      name: "too many columns",
      source: {
        id: "mx_vector_a_b_c_d_e",
        exists: true,
        nrow: 10,
        ncol: 201,
      },
    },
    {
      name: "missing dimensions",
      source: {
        id: "mx_vector_a_b_c_d_e",
        exists: true,
        nrow: null,
        ncol: null,
      },
    },
  ])("rejects $name for the table editor only", async ({ source }) => {
    pickerMock.pickSources.mockImplementation(async (options) => {
      pickerMock.wsGetSourcesList.mockResolvedValue({
        list: source ? [source] : [],
      });
      const validation = await options.validateSelection({
        value: "mx_vector_a_b_c_d_e",
        items: [],
      });
      expect(validation).toEqual({
        valid: false,
        message:
          source?.nrow > 100000 || source?.ncol > 200
            ? "translated:edit_table_picker_excessive_dimensions:100 000:200"
            : source &&
                (source.nrow === null ||
                  source.nrow === undefined ||
                  source.ncol === null ||
                  source.ncol === undefined)
              ? "translated:edit_table_picker_unavailable_dimensions"
              : "translated:edit_table_picker_unavailable_table",
      });
      return null;
    });

    await pickEditableTableSource({ root: document.createElement("div") });

    expect(pickerMock.wsGetSourcesList).toHaveBeenCalledWith({
      idSources: ["mx_vector_a_b_c_d_e"],
      types: ["vector", "tabular"],
      editable: true,
      readable: false,
      add_global: false,
      add_views: false,
      include_dimensions: true,
    });
  });

  it("accepts the exact Handsontable size boundaries", async () => {
    pickerMock.pickSources.mockImplementation(async (options) => {
      pickerMock.wsGetSourcesList.mockResolvedValue({
        list: [
          {
            id: "mx_vector_a_b_c_d_e",
            exists: true,
            nrow: "100000",
            ncol: 200,
          },
        ],
      });
      await expect(
        options.validateSelection({
          value: "mx_vector_a_b_c_d_e",
          items: [],
        }),
      ).resolves.toEqual({ valid: true });
      return { value: "mx_vector_a_b_c_d_e", items: [] };
    });

    await expect(
      pickEditableTableSource({ root: document.createElement("div") }),
    ).resolves.toBe("mx_vector_a_b_c_d_e");
  });
});
