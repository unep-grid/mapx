import { describe, expect, it } from "vitest";
import services from "./wms.json";

const removedHosts = [
  "preview.grid.unep.ch",
  "gis-gfw.wri.org",
  "sedac.ciesin.columbia.edu",
  "sampleserver6.arcgisonline.com",
  "geoportal.idesa.gob.ar",
  "mapas.apn.gob.ar",
  "geointa.inta.gov.ar",
];

describe("WMS service presets", () => {
  it("contains unique, labelled HTTPS endpoints", () => {
    expect(services.length).toBeGreaterThan(0);

    for (const service of services) {
      expect(service.label.trim()).not.toBe("");
      expect(new URL(service.value).protocol).toBe("https:");
    }

    expect(new Set(services.map(({ label }) => label)).size).toBe(
      services.length,
    );
    expect(new Set(services.map(({ value }) => value)).size).toBe(
      services.length,
    );
  });

  it("uses the migrated nowCOAST endpoint and excludes retired services", () => {
    expect(services).toContainEqual({
      label: "nowcoast.noaa.gov",
      value: "https://nowcoast.noaa.gov/geoserver/wms",
    });

    const hosts = services.map(({ value }) => new URL(value).hostname);
    expect(hosts).not.toEqual(expect.arrayContaining(removedHosts));
  });
});
