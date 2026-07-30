import { describe, expect, it, vi } from "vitest";

vi.mock("#mapx/language", () => ({
  translate: (id) => id,
}));

import { getSchema } from "./schema.js";

describe("join source picker schema", () => {
  it("uses geometry-capable vectors for the base and vector/tabular inputs for joins", () => {
    const schema = getSchema("en");
    const base = schema.properties.base.properties.id_source.mx_options;
    const joined =
      schema.properties.joins.items.properties.id_source.mx_options;

    expect(base).toEqual({
      renderer: "source-picker",
      acceptedTypes: ["vector"],
      requiredCapabilities: ["geometry"],
      accessMode: "readable",
    });
    expect(joined).toEqual({
      renderer: "source-picker",
      acceptedTypes: ["vector", "tabular"],
      requiredCapabilities: [],
      accessMode: "readable",
    });
    expect(
      schema.properties.base.properties.columns.mx_options.watch,
    ).toEqual({
      property: "id_source",
      path: "root.base",
    });
    expect(
      schema.properties.joins.items.properties.columns.mx_options.watch,
    ).toEqual({
      property: "id_source",
      path: ".",
    });
  });
});
