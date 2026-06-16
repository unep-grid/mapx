import { describe, expect, it } from "vitest";
import dictCodeIntegration from "../../data/dict/dict_code_integration.json";

const labelsById = Object.fromEntries(
  dictCodeIntegration.map((item) => [item.id, item.en]),
);

describe("code integration labels", () => {
  it("uses MapLibre labels for GL style exports", () => {
    const labels = [
      labelsById.code_integration_template_mapbox_layers,
      labelsById.code_integration_template_mapbox_style,
      labelsById.code_integration_template_mapbox_style_basemap,
      labelsById.code_integration_template_maplibre_simple_app,
    ];

    expect(labels).toEqual([
      "MapLibre style (layers only)",
      "MapLibre style (full)",
      "MapLibre base style",
      "Simple HTML/JS app using MapLibre",
    ]);
    expect(labels.join(" ")).not.toMatch(/mapbox/i);
  });
});
