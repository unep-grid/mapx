import { describe, expect, it } from "vitest";
import {
  aggregateCountryMonthRange,
  buildClassPieces,
  buildCountryPoints,
  buildMonthKeys,
  fillMonthlyCounts,
  formatMonthLabel,
  groupCountryMonthRows,
  limitCountryRows,
  symbolSizeByCount,
} from "./helpers";

describe("view stats helpers", () => {
  it("builds the last sixty month keys by default", () => {
    const months = buildMonthKeys(new Date(Date.UTC(2026, 4, 12)));

    expect(months).toHaveLength(60);
    expect(months[0]).toBe("2021-06");
    expect(months[59]).toBe("2026-05");
  });

  it("builds custom month keys in chronological order", () => {
    expect(buildMonthKeys(new Date(Date.UTC(2026, 4, 12)), 12)).toEqual([
      "2025-06",
      "2025-07",
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
  });

  it("fills missing monthly counts with zero", () => {
    const rows = fillMonthlyCounts(
      [
        { month: "2026-01-01", count: "3" },
        { month: "2026-03-01", count: 7 },
      ],
      ["2026-01", "2026-02", "2026-03"],
    );

    expect(rows).toEqual([
      { month: "2026-01", count: 3 },
      { month: "2026-02", count: 0 },
      { month: "2026-03", count: 7 },
    ]);
  });

  it("groups country rows by month and tracks a stable maximum", () => {
    const grouped = groupCountryMonthRows(
      [
        { month: "2026-01-01", country: "CH", count: 2 },
        { month: "2026-01-01", country: "FR", count: "5" },
        { month: "2026-02-01", country: "CH", count: 1 },
        { month: "2026-02-01", country: null, count: 99 },
      ],
      ["2026-01", "2026-02"],
    );

    expect(grouped.max).toBe(5);
    expect(grouped.months).toEqual([
      {
        month: "2026-01",
        data: [
          { name: "CH", value: 2 },
          { name: "FR", value: 5 },
        ],
      },
      {
        month: "2026-02",
        data: [{ name: "CH", value: 1 }],
      },
    ]);
  });

  it("limits country rows and aggregates overflow as others", () => {
    expect(
      limitCountryRows(
        [
          { country: "A", count: 5 },
          { country: "B", count: 4 },
          { country: "C", count: 3 },
        ],
        2,
        "Others",
      ),
    ).toEqual([
      { country: "A", count: 5 },
      { country: "B", count: 4 },
      { country: "Others", count: 3 },
    ]);
  });

  it("builds bounded class pieces", () => {
    expect(buildClassPieces(12, 5)).toEqual([
      { min: 0, max: 3 },
      { min: 4, max: 6 },
      { min: 7, max: 9 },
      { min: 10, max: 12 },
    ]);
    expect(buildClassPieces(0, 5)).toEqual([{ min: 0, max: 0 }]);
  });

  it("formats month labels", () => {
    expect(formatMonthLabel("2026-05", "en")).toBe("May 2026");
  });

  it("aggregates country counts over an inclusive month range", () => {
    const aggregated = aggregateCountryMonthRange(
      [
        { month: "2026-01-01", country: "CH", count: 2 },
        { month: "2026-02-01", country: "CH", count: 3 },
        { month: "2026-02-01", country: "FR", count: 4 },
        { month: "2026-03-01", country: "CH", count: 20 },
      ],
      ["2026-01", "2026-02", "2026-03"],
      [0, 1],
    );

    expect(aggregated).toEqual({
      max: 5,
      countries: [
        { country: "CH", count: 5 },
        { country: "FR", count: 4 },
      ],
    });
  });

  it("excludes unknown countries from range aggregation", () => {
    const aggregated = aggregateCountryMonthRange(
      [
        { month: "2026-01-01", country: "?", count: 10 },
        { month: "2026-01-01", country: null, count: 8 },
        { month: "2026-01-01", country: "CH", count: 2 },
      ],
      ["2026-01"],
      [0, 0],
    );

    expect(aggregated).toEqual({
      max: 2,
      countries: [{ country: "CH", count: 2 }],
    });
  });

  it("builds map points only when a centroid is available", () => {
    expect(
      buildCountryPoints(
        {
          countries: [
            { country: "CH", count: 5 },
            { country: "FR", count: 3 },
          ],
        },
        new Map([["CH", [8.2, 46.8]]]),
      ),
    ).toEqual([
      {
        name: "CH",
        count: 5,
        value: [8.2, 46.8, 5],
      },
    ]);
  });

  it("scales proportional symbols with square-root sizing", () => {
    expect(symbolSizeByCount(0, 100)).toBe(0);
    expect(symbolSizeByCount(100, 100)).toBe(42);
    expect(symbolSizeByCount(25, 100)).toBe(23);
  });
});
