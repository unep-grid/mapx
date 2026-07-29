import { describe, expect, it } from "vitest";
import {
  buildSourceTiles,
  getPublicApiBaseUrl,
  normalizeRasterTiles,
} from "./tiles.js";

describe("search source tiles", () => {
  it("normalizes absolute raster templates and preserves their order", () => {
    expect(
      normalizeRasterTiles([
        " https://tiles.example.org/wms?bbox={bbox-epsg-3857} ",
        "http://tiles.example.org/{z}/{x}/{y}.png",
      ]),
    ).toEqual([
      "https://tiles.example.org/wms?bbox={bbox-epsg-3857}",
      "http://tiles.example.org/{z}/{x}/{y}.png",
    ]);
  });

  it("rejects empty, relative, malformed, and non-HTTP raster entries", () => {
    expect(
      normalizeRasterTiles([
        "",
        " /tiles/{z}/{x}/{y}.png ",
        "not a url",
        "ftp://tiles.example.org/{z}/{x}/{y}.png",
        null,
      ]),
    ).toEqual([]);
  });

  it("preserves multiple raster endpoints, including duplicates", () => {
    const url = "https://tiles.example.org/{z}/{x}/{y}.png";
    expect(normalizeRasterTiles([url, url])).toEqual([url, url]);
  });

  it("reads raster templates from the search document", () => {
    expect(
      buildSourceTiles(
        {
          source_tiles: [
            " https://tiles.example.org/wms?bbox={bbox-epsg-3857} ",
          ],
          view_type: "rt",
        },
        {},
      ),
    ).toEqual([
      "https://tiles.example.org/wms?bbox={bbox-epsg-3857}",
    ]);
  });

  it("builds a vector template using the configured development API", () => {
    expect(
      buildSourceTiles(
        {
          view_id: "MX-J9P0S-B421T-2NTTN",
          view_type: "vt",
        },
        {
          host_public: "apidev.mapx.localhost",
          port_public: "8880",
        },
      ),
    ).toEqual([
      "http://apidev.mapx.localhost:8880/get/tile/{x}/{y}/{z}.mvt?idView=MX-J9P0S-B421T-2NTTN",
    ]);
  });

  it("uses HTTPS and omits its default port from vector templates", () => {
    expect(
      getPublicApiBaseUrl({
        host_public: "api.mapx.org",
        port_public: "443",
      }),
    ).toBe("https://api.mapx.org");
  });

  it("honors an explicit protocol and non-default port", () => {
    expect(
      getPublicApiBaseUrl({
        host_public: "api.example.org",
        port_public: "8443",
        protocol: "https:",
      }),
    ).toBe("https://api.example.org:8443");
  });

  it("returns no tiles for unsupported views or incomplete API settings", () => {
    expect(buildSourceTiles({ view_type: "gj" }, {})).toEqual([]);
    expect(
      buildSourceTiles({ view_id: "MX-J9P0S-B421T-2NTTN", view_type: "vt" }, {}),
    ).toEqual([]);
  });
});
