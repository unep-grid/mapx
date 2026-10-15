import { describe, expect, it, vi } from "vitest";
import { getClickFeaturesData } from "./click_features.js";

const event = {
  point: { x: 10, y: 20 },
  lngLat: { lng: 30, lat: 0 },
};

describe("getClickFeaturesData", () => {
  it("returns an empty result when no view was queried", async () => {
    await expect(getClickFeaturesData({}, event)).resolves.toEqual({
      attributes: {},
      point: event.point,
      lngLat: event.lngLat,
    });
  });

  it("groups the attributes of every view hit by the click", async () => {
    const data = await getClickFeaturesData(
      {
        "MX-A": Promise.resolve([{ name: "a" }]),
        "MX-B": Promise.resolve([]),
        "MX-C": Promise.resolve([{ value: 3 }]),
      },
      event,
    );

    expect(data.attributes).toEqual({
      "MX-A": [{ name: "a" }],
      "MX-C": [{ value: 3 }],
    });
    expect(data.lngLat).toBe(event.lngLat);
  });

  it("ignores views whose query failed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const data = await getClickFeaturesData(
      {
        "MX-A": Promise.reject(new Error("wms down")),
        "MX-B": Promise.resolve([{ name: "b" }]),
      },
      event,
    );

    expect(data.attributes).toEqual({ "MX-B": [{ name: "b" }] });
    vi.restoreAllMocks();
  });
});
