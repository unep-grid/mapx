import { beforeAll, describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";

vi.mock("../../el_mapx", () => ({
  el: () => document.createElement("div"),
  elSpanTranslate: () => document.createElement("span"),
}));

vi.mock("../../el_mapx/index.js", () => ({
  el: () => document.createElement("div"),
  elSpanTranslate: () => document.createElement("span"),
}));

vi.mock("../../map_helpers", () => ({
  layersOrderAuto: () => {},
}));

vi.mock("../../map_helpers/index.js", () => ({
  layersOrderAuto: () => {},
}));

vi.mock("../../settings", () => ({
  settings: {
    layerBefore: null,
  },
}));

vi.mock("../../mx_helper_misc", () => ({
  makeId: () => "test-id",
}));

vi.mock("../../mx_helper_misc.js", () => ({
  makeId: () => "test-id",
}));

let WMSTimeMapLegend;

beforeAll(async () => {
  ({ WMSTimeMapLegend } = await import("./wms_time_map_legend.js"));
});

function makeCapabilitiesXml({
  layerName = "gpcc_precipitation_quantile_12month_19912020",
  defaultTime = "2025-01-01T00:00:00Z",
  extent = "1982-01-01T00:00:00.000Z/2025-01-01T00:00:00.000Z/P1Y",
} = {}) {
  return `
<WMS_Capabilities version="1.3.0">
  <Capability>
    <Layer>
      <Layer queryable="1" opaque="0">
        <Name>${layerName}</Name>
        <Title>${layerName}</Title>
        <Abstract>Test layer</Abstract>
        <Dimension name="time" default="${defaultTime}" units="ISO8601">
          ${extent}
        </Dimension>
        <Style>
          <Name>gpcc_precipitation_quantile_12month</Name>
          <LegendURL width="148" height="116">
            <Format>image/png</Format>
            <OnlineResource
              xmlns:xlink="http://www.w3.org/1999/xlink"
              xlink:type="simple"
              xlink:href="https://datacore.unepgrid.ch/geoserver/wmo/ows?service=WMS&amp;request=GetLegendGraphic&amp;layer=gpcc_precipitation_quantile_12month_19912020"/>
          </LegendURL>
        </Style>
      </Layer>
    </Layer>
  </Capability>
</WMS_Capabilities>`;
}

function makeLegend(options = {}) {
  const layerName =
    options.layerName || "gpcc_precipitation_quantile_12month_19912020";
  const xmlDoc = new DOMParser().parseFromString(
    makeCapabilitiesXml({
      ...options,
      layerName,
    }),
    "application/xml",
  );
  const legend = new WMSTimeMapLegend({
    layerName,
    increment: "P1Y",
  });
  legend._layer_info = legend.createLayerInfo(xmlDoc);
  legend.setTime(legend.getTimeDefault());
  legend.setSlot(legend.getDefaultSlot());
  return legend;
}

function iso(date) {
  return DateTime.fromISO(`${date}T00:00:00Z`).toUTC();
}

describe("WMSTimeMapLegend time dimensions", () => {
  it("parses yearly WMS time intervals and the namespaced legend URL", () => {
    const legend = makeLegend();
    const layerInfo = legend.getLayerInfoAll();

    expect(layerInfo.time_default.toISO()).toBe("2025-01-01T00:00:00.000Z");
    expect(layerInfo.time_slots).toHaveLength(1);
    expect(layerInfo.time_slots[0].start.toISO()).toBe(
      "1982-01-01T00:00:00.000Z",
    );
    expect(layerInfo.time_slots[0].end.toISO()).toBe(
      "2025-01-01T00:00:00.000Z",
    );
    expect(layerInfo.time_slots[0].step.toISO()).toBe("P1Y");
    expect(layerInfo.styles[0].url_legend).toContain("GetLegendGraphic");
    expect(layerInfo.styles[0].url_legend).toContain(
      "gpcc_precipitation_quantile_12month_19912020",
    );
  });

  it("validates only actual yearly timesteps inside a P1Y interval", () => {
    const legend = makeLegend();

    expect(legend.validate(iso("1985-01-01"))).toBe(true);
    expect(legend.validate(iso("2025-01-01"))).toBe(true);
    expect(legend.validate(iso("1985-12-31"))).toBe(false);
    expect(legend.validate(iso("1985-01-02"))).toBe(false);
  });

  it("steps through yearly timesteps without drifting to December 31", () => {
    const legend = makeLegend();
    const dates = [];

    for (let i = 0; i < 5; i++) {
      const next = legend.getNextTimeSlot();
      legend.setSlot(next.slot);
      legend.setTime(next.time);
      dates.push(next.time.toISODate());
    }

    expect(dates).toEqual([
      "1982-01-01",
      "1983-01-01",
      "1984-01-01",
      "1985-01-01",
      "1986-01-01",
    ]);
  });

  it("wraps previous from the first yearly timestep to the last", () => {
    const legend = makeLegend();
    legend.setTime(iso("1982-01-01"));
    legend.setSlot(legend.getSlotFromTime(legend.getTime()));

    const previous = legend.getPreviousTimeSlot();

    expect(previous.time.toISODate()).toBe("2025-01-01");
  });

  it("interprets Flatpickr calendar dates as UTC dates", () => {
    const legend = makeLegend({
      defaultTime: "2025-02-01T00:00:00Z",
      extent: "1998-02-01T00:00:00.000Z/2025-02-01T00:00:00.000Z/P1Y",
    });

    expect(legend.getDateInputAsUtc(new Date(1998, 1, 1)).toISO()).toBe(
      "1998-02-01T00:00:00.000Z",
    );
    expect(legend.validate(legend.getDateInputAsUtc(new Date(1998, 1, 1)))).toBe(
      true,
    );
    expect(legend.validate(legend.getDateInputAsUtc(new Date(1998, 0, 31)))).toBe(
      false,
    );
    expect(legend.validate(legend.getDateInputAsUtc(new Date(1998, 1, 2)))).toBe(
      false,
    );
  });
});
