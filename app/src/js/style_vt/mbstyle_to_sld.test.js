import { describe, expect, it, vi } from "vitest";

vi.mock("./../api_routes/index.js", () => ({
  getApiUrl: () => "https://api.example.test/s3",
}));

import {
  fixSldExternalGraphicFormat,
  getMapboxStyleForSld,
  getSpriteUrlForSld,
  spriteToCdnLink,
  stripSpriteNamespace,
} from "./mbstyle_to_sld.js";

const sprites = [
  {
    id: "default",
    url: "https://example.com/style/v1/sprites/sprite",
  },
  {
    id: "patterns",
    url: "https://example.com/style/v1/sprites/sprite_patterns",
  },
];

describe("mbstyle_to_sld", () => {
  describe("getSpriteUrlForSld", () => {
    it("keeps string sprite URLs unchanged", () => {
      expect(getSpriteUrlForSld("https://example.com/sprite")).toBe(
        "https://example.com/sprite",
      );
    });

    it("selects the default sprite for point styles", () => {
      expect(getSpriteUrlForSld(sprites, { geomType: "point" })).toBe(
        "https://example.com/style/v1/sprites/sprite",
      );
    });

    it("selects the patterns sprite for polygon styles", () => {
      expect(getSpriteUrlForSld(sprites, { geomType: "polygon" })).toBe(
        "https://example.com/style/v1/sprites/sprite_patterns",
      );
    });

    it("falls back to default for missing or unknown geometry", () => {
      expect(getSpriteUrlForSld(sprites)).toBe(
        "https://example.com/style/v1/sprites/sprite",
      );
      expect(getSpriteUrlForSld(sprites, { geomType: "line" })).toBe(
        "https://example.com/style/v1/sprites/sprite",
      );
    });

    it("ignores invalid sprite values", () => {
      expect(getSpriteUrlForSld({ id: "default" })).toBeUndefined();
      expect(getSpriteUrlForSld([{ id: "default" }])).toBeUndefined();
    });
  });

  describe("getMapboxStyleForSld", () => {
    it("clones and replaces a multi-sprite array with one URL", () => {
      const style = {
        version: 8,
        sprite: sprites,
        layers: [],
        sources: {},
      };
      const out = getMapboxStyleForSld(style, { geomType: "polygon" });

      expect(out).not.toBe(style);
      expect(out.sprite).toBe("https://example.com/style/v1/sprites/sprite_patterns");
      expect(style.sprite).toBe(sprites);
    });

    it("removes invalid sprite values", () => {
      const out = getMapboxStyleForSld({
        version: 8,
        sprite: [{ id: "default" }],
      });

      expect(out).not.toHaveProperty("sprite");
    });
  });

  describe("spriteToCdnLink", () => {
    it("strips MapLibre sprite namespaces before building S3 SVG URLs", () => {
      const url = spriteToCdnLink("/sprites/?name=patterns:t_b_lines_01", {
        fill: "#AABBCC",
      });

      expect(url).toBeInstanceOf(URL);
      expect(url.href).toContain("/s3/style/v1/svg/t_b_lines_01.svg");
      expect(url.searchParams.get("fill")).toBe("#AABBCC");
    });

    it("strips only the sprite namespace prefix", () => {
      expect(stripSpriteNamespace("patterns:t_b_lines_01")).toBe(
        "t_b_lines_01",
      );
      expect(stripSpriteNamespace("maki-airport-11")).toBe("maki-airport-11");
    });
  });

  describe("fixSldExternalGraphicFormat", () => {
    it("sets SVG format for external graphic URLs with query strings", () => {
      const sld = `<?xml version="1.0" encoding="UTF-8"?>
<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld">
  <sld:ExternalGraphic>
    <sld:OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://apidev.mapx.localhost:8880/s3/style/v1/svg/maki-marker-11.svg?fill=%2374c476"/>
    <sld:Format/>
  </sld:ExternalGraphic>
</sld:StyledLayerDescriptor>`;

      const out = fixSldExternalGraphicFormat(sld);
      const dom = new DOMParser().parseFromString(out, "application/xml");
      const format = dom.querySelector("Format, sld\\:Format");

      expect(format.textContent).toBe("image/svg+xml");
    });
  });
});
