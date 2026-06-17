import { beforeEach, describe, expect, it, vi } from "vitest";

const metadataMocks = vi.hoisted(() => ({
  getViewMetaToHtml: vi.fn((id) => Promise.resolve(`<html>${id}</html>`)),
  getViewMetadata: vi.fn(() => Promise.resolve({})),
  getViewSourceMetadata: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../metadata/utils.js", () => metadataMocks);

import { AttributionManager } from "./index.js";

function createManager(style, options) {
  return new AttributionManager(
    {
      getStyle: () => style,
    },
    options,
  );
}

describe("AttributionManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    metadataMocks.getViewMetaToHtml.mockImplementation((id) =>
      Promise.resolve(`<html>${id}</html>`),
    );
    metadataMocks.getViewMetadata.mockResolvedValue({});
    metadataMocks.getViewSourceMetadata.mockResolvedValue([]);
  });

  it("extracts source attributions and converts HTML to text", () => {
    const manager = createManager({
      sources: {
        protomaps_basemap: {
          type: "vector",
          attribution:
            "© <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors",
        },
        satellite: {
          type: "raster",
          attribution:
            '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>',
        },
      },
    });

    expect(manager.rows()).toEqual([
      {
        kind: "source",
        id: "mapx",
        type: "application",
        attribution_html: "© UNEP/GRID MapX",
        attribution_text: "© UNEP/GRID MapX",
      },
      {
        kind: "source",
        id: "protomaps_basemap",
        type: "vector",
        attribution_html:
          "© <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors",
        attribution_text: "© OpenStreetMap contributors",
      },
      {
        kind: "source",
        id: "satellite",
        type: "raster",
        attribution_html:
          '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>',
        attribution_text: "© MapTiler",
      },
    ]);
  });

  it("includes supported layer metadata attributions", () => {
    const manager = createManager({
      layers: [
        {
          id: "mineral_operations",
          type: "circle",
          source: "MX-V7AY6-OCTNO-ZB4FV-SRC",
          metadata: {
            "mapx:attribution":
              '<a href="https://mrdata.usgs.gov/">Mineral operations outside the United States (USGS, 2010)</a>',
          },
        },
      ],
    });

    expect(manager.rows()).toEqual([
      {
        kind: "source",
        id: "mapx",
        type: "application",
        attribution_html: "© UNEP/GRID MapX",
        attribution_text: "© UNEP/GRID MapX",
      },
      {
        kind: "layer",
        id: "mineral_operations",
        type: "circle",
        source: "MX-V7AY6-OCTNO-ZB4FV-SRC",
        attribution_html:
          '<a href="https://mrdata.usgs.gov/">Mineral operations outside the United States (USGS, 2010)</a>',
        attribution_text: "Mineral operations outside the United States (USGS, 2010)",
      },
    ]);
  });

  it("adds visible view and source metadata attribution rows", async () => {
    metadataMocks.getViewMetadata.mockResolvedValue({
      text: {
        title: { en: "ACLED Africa" },
        data_attribution: "ACLED data attribution",
        citation: "ACLED citation",
      },
      license: {
        licenses: [{ name: "CC BY", text: "Creative Commons" }],
      },
      origin: {
        homepage: { label: "ACLED", url: "https://acleddata.com" },
      },
    });
    metadataMocks.getViewSourceMetadata.mockResolvedValue([
      {
        _id_source: "mx_vector_abc",
        text: {
          title: { en: "ACLED source" },
          data_attribution: "<a>ACLED source attribution</a>",
        },
        origin: {
          source: {
            urls: [{ label: "Download", url: "https://example.com/source" }],
          },
        },
      },
    ]);

    const manager = createManager({}, { idViews: ["MX-ABC12-ABC12-ABC12"] });
    const rows = await manager.getRows();

    expect(rows).toEqual([
      {
        kind: "source",
        id: "mapx",
        type: "application",
        attribution_html: "© UNEP/GRID MapX",
        attribution_text: "© UNEP/GRID MapX",
      },
      {
        kind: "view_metadata",
        id: "MX-ABC12-ABC12-ABC12",
        type: "view",
        title: "ACLED Africa",
        data_attribution: "ACLED data attribution",
        citation: "ACLED citation",
        licenses: [{ name: "CC BY", text: "Creative Commons" }],
        homepage: { label: "ACLED", url: "https://acleddata.com" },
        attribution_text: "ACLED data attribution",
        attribution_html: "ACLED data attribution",
      },
      {
        kind: "source_metadata",
        id: "mx_vector_abc",
        type: "source",
        title: "ACLED source",
        data_attribution: "ACLED source attribution",
        source_urls: [{ label: "Download", url: "https://example.com/source" }],
        attribution_text: "ACLED source attribution",
        attribution_html: "ACLED source attribution",
        view: "MX-ABC12-ABC12-ABC12",
      },
    ]);
  });

  it("deduplicates attributions by readable text", async () => {
    metadataMocks.getViewMetadata.mockResolvedValue({
      text: {
        title: { en: "Duplicate" },
        data_attribution: "Repeated attribution",
      },
    });

    const manager = createManager(
      {
        sources: {
          a: {
            type: "vector",
            attribution: '<a href="https://mapx.org">Repeated attribution</a>',
          },
          b: {
            type: "vector",
            attribution: "<a>Repeated attribution</a>",
          },
        },
      },
      { idViews: ["MX-ABC12-ABC12-ABC12"] },
    );

    const rows = await manager.getRows();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      kind: "source",
      id: "a",
      attribution_text: "Repeated attribution",
    });
  });

  it("formats markdown and JSON sidecar content", async () => {
    const manager = createManager({
      sources: {
        terrain: {
          type: "raster-dem",
          attribution:
            "Terrain tiles © <a href='https://mapterhorn.com/attribution'>Mapterhorn</a>",
        },
      },
    });

    const markdown = await manager.markdown();
    expect(markdown).toContain("# Map Attribution");
    expect(markdown).toContain("- © UNEP/GRID MapX");
    expect(markdown).toContain("- Terrain tiles © Mapterhorn");
    expect(markdown).not.toContain("This file was generated");
    expect(markdown).not.toContain("Map Style Attributions");
    expect(markdown).not.toContain("View and Source Metadata");

    const rows = JSON.parse(await manager.json());
    expect(rows).toEqual(await manager.getRows());
  });

  it("generates metadata and attribution file descriptors", async () => {
    const manager = createManager(
      {
        sources: {
          satellite: {
            type: "raster",
            attribution: "© MapTiler",
          },
        },
      },
      {
        idViews: ["MX-ABC12-ABC12-ABC12"],
        template: "# Attribution Template",
      },
    );

    const files = await manager.getFiles();

    expect(files.map((file) => file.name)).toEqual([
      "view_metadata_MX-ABC12-ABC12-ABC12.html",
      "attribution.md",
      "map_attributions.md",
      "map_attributions.json",
    ]);
    expect(files.find((file) => file.name === "attribution.md").content).toBe(
      "# Attribution Template",
    );
    expect(metadataMocks.getViewMetaToHtml).toHaveBeenCalledWith(
      "MX-ABC12-ABC12-ABC12",
    );
  });
});
