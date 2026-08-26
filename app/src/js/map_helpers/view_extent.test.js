import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_VIEW_EXTENT,
  getDefaultViewExtent,
  getViewExtentSummaryOptions,
  resolveViewExtent,
} from "./view_extent.js";

const validExtent = {
  lat1: 1,
  lat2: 2,
  lng1: 3,
  lng2: 4,
};

const isValidExtent = (extent) =>
  extent?.lat1 === 1 &&
  extent?.lat2 === 2 &&
  extent?.lng1 === 3 &&
  extent?.lng2 === 4;

function options(overrides = {}) {
  return {
    embeddedExtent: null,
    getMetadataExtent: vi.fn(async () => null),
    getSummaryExtent: vi.fn(async () => null),
    isValidExtent,
    timeoutPromise: new Promise(() => {}),
    ...overrides,
  };
}

describe("resolveViewExtent", () => {
  it("uses an embedded extent without performing another read", async () => {
    const opt = options({ embeddedExtent: validExtent });

    await expect(resolveViewExtent(opt)).resolves.toBe(validExtent);
    expect(opt.getMetadataExtent).not.toHaveBeenCalled();
    expect(opt.getSummaryExtent).not.toHaveBeenCalled();
  });

  it("uses stored metadata before the source summary", async () => {
    const opt = options({
      getMetadataExtent: vi.fn(async () => validExtent),
    });

    await expect(resolveViewExtent(opt)).resolves.toBe(validExtent);
    expect(opt.getSummaryExtent).not.toHaveBeenCalled();
  });

  it("uses the source summary when metadata has no valid extent", async () => {
    const opt = options({
      getSummaryExtent: vi.fn(async () => validExtent),
    });

    await expect(resolveViewExtent(opt)).resolves.toBe(validExtent);
    expect(opt.getMetadataExtent).toHaveBeenCalledOnce();
    expect(opt.getSummaryExtent).toHaveBeenCalledOnce();
  });

  it("returns a fresh default extent when no read produces a valid extent", async () => {
    const first = await resolveViewExtent(options());
    const second = await resolveViewExtent(options());

    expect(first).toEqual(DEFAULT_VIEW_EXTENT);
    expect(first).not.toBe(DEFAULT_VIEW_EXTENT);
    expect(second).not.toBe(first);
  });

  it("returns the default extent when the read times out", async () => {
    const opt = options({
      getMetadataExtent: vi.fn(() => new Promise(() => {})),
      timeoutPromise: Promise.resolve(false),
    });

    await expect(resolveViewExtent(opt)).resolves.toEqual(DEFAULT_VIEW_EXTENT);
    expect(opt.getSummaryExtent).not.toHaveBeenCalled();
  });

  it("exposes a mutable copy of the frozen default", () => {
    const extent = getDefaultViewExtent();

    extent.lat1 = -70;
    expect(extent.lat1).toBe(-70);
    expect(DEFAULT_VIEW_EXTENT.lat1).toBe(-80);
  });

  it("requests only the cached spatial source summary", () => {
    expect(getViewExtentSummaryOptions()).toEqual({
      useCache: true,
      stats: ["spatial"],
    });
  });
});
