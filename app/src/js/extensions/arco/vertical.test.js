import { describe, expect, it } from "vitest";
import {
  formatVerticalAxisLabel,
  getVerticalKind,
  orderVerticalValues,
} from "./vertical.js";

describe("ARCO vertical axis helpers", () => {
  it("orders negative depths from surface to bottom", () => {
    expect(
      orderVerticalValues([-5727, -0.49, -77], {
        name: "depth",
        label: "depth",
      }),
    ).toEqual([-0.49, -77, -5727]);
  });

  it("orders positive depths from surface to bottom", () => {
    expect(
      orderVerticalValues([100, 0.5, 10], {
        name: "depth",
        label: "depth",
      }),
    ).toEqual([0.5, 10, 100]);
  });

  it("orders elevations from up to down", () => {
    expect(
      orderVerticalValues([-100, -10, 250], {
        name: "elevation",
        label: "elevation",
      }),
    ).toEqual([250, -10, -100]);
  });

  it("treats negative-only elevation coordinates as depth", () => {
    const values = [-5727, -0.49, -77];
    const meta = {
      name: "elevation",
      label: "elevation",
    };

    expect(getVerticalKind(meta, values)).toBe("depth");
    expect(formatVerticalAxisLabel(meta, values)).toBe("Depth");
    expect(orderVerticalValues(values, meta)).toEqual([-0.49, -77, -5727]);
  });

  it("keeps unknown vertical axes in metadata order", () => {
    expect(
      orderVerticalValues([3, 1, 2], {
        name: "level",
        label: "level",
      }),
    ).toEqual([3, 1, 2]);
  });

  it("formats visible vertical labels", () => {
    expect(formatVerticalAxisLabel({ label: "depth" })).toBe("Depth");
    expect(formatVerticalAxisLabel({ label: "elevation" }, [10])).toBe(
      "Elevation",
    );
    expect(formatVerticalAxisLabel({ label: "pressure_level" })).toBe(
      "Pressure Level",
    );
    expect(getVerticalKind({ name: "altitude" })).toBe("elevation");
  });
});
