import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFeatureFilename,
  buildFeatureGeoJSON,
  canAttemptEdit,
  canEditFromSummary,
  canFetchAuthoritativeFeature,
  collectFeatureItems,
  formatCoordinates,
  getInitialEditState,
  getGeometryType,
  getResolvedEditState,
  resolveEditState,
} from "./helpers";
import type { MapContextMenuMapApi } from "./types";

const idProject = "MX-AAA-BBB-CCC-DDD-EEE";
const idViewA = "MX-AAAAA-BBBBB-CCCCC";
const idViewB = "MX-DDDDD-EEEEE-FFFFF";

const baseItem = {
  idView: idViewA,
  view: {
    id: idViewA,
    type: "vt",
    project: idProject,
    data: {
      source: {
        layerInfo: {
          name: "mx_vector_a_b_c_d_e",
        },
      },
    },
  },
  gid: 12,
  idSource: "mx_vector_a_b_c_d_e",
  title: "Layer Title",
  properties: {
    gid: 12,
    name: "A",
  },
  geometry: {
    type: "Point",
    coordinates: [1, 2],
  },
};

const api = {
  getFeaturesAtBbox: (_map: any, _bbox: any, idView: string) => [
    { id: 1, properties: { gid: 1, label: `${idView}-1` }, geometry: null },
    { id: 2, properties: { gid: 2, label: `${idView}-2` }, geometry: null },
  ],
  getLayerNamesByPrefix: () => [idViewB, idViewA],
  getView: (id: string) => ({
    id,
    type: "vt",
    project: idProject,
    data: {
      source: {
        layerInfo: {
          name: "mx_vector_a_b_c_d_e",
        },
      },
    },
  }),
  getViewTitle: (view: any) => `Title ${view.id}`,
  getViewsOrder: () => [idViewA, idViewB],
  getViewSourceSummary: async () => ({ type: "vector" }),
  viewsReplace: async () => true,
} as MapContextMenuMapApi;

describe("map context menu helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats coordinates", () => {
    expect(formatCoordinates({ lng: 7.1234567, lat: 46.9876543 })).toBe(
      "7.123457, 46.987654",
    );
  });

  it("detects draw geometry modes", () => {
    expect(getGeometryType({ type: "MultiPoint" })).toBe("point");
    expect(getGeometryType({ type: "LineString" })).toBe("line");
    expect(getGeometryType({ type: "MultiPolygon" })).toBe("polygon");
    expect(getGeometryType(null)).toBe("polygon");
  });

  it("collects clicked feature items in view order with a max limit", () => {
    const items = collectFeatureItems({
      event: {
        point: { x: 1, y: 1 },
        lngLat: { lng: 7, lat: 46 },
      },
      map: {} as any,
      api,
      maxItems: 3,
    });
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.idView)).toEqual([
      idViewA,
      idViewA,
      idViewB,
    ]);
  });

  it("gates edit attempts before remote role checks", () => {
    const settings = {
      mode: { static: false },
      user: { id: "user_a" },
    };
    expect(canAttemptEdit(baseItem, settings)).toBe(true);
    expect(
      canAttemptEdit(
        {
          ...baseItem,
          gid: null,
        },
        settings,
      ),
    ).toBe(false);
    expect(
      canAttemptEdit(baseItem, {
        ...settings,
        mode: { static: true },
      }),
    ).toBe(false);
  });

  it("resolves edit permission from source summary and user roles", () => {
    const settings = {
      project: { id: idProject },
      user: {
        id: "user_a",
        roles: {
          groups: ["editors"],
        },
      },
    };
    expect(
      canEditFromSummary(
        baseItem,
        {
          type: "vector",
          roles: { editor: "other", editors: ["editors"] },
        },
        settings,
      ),
    ).toBe(true);
    expect(
      canEditFromSummary(
        {
          ...baseItem,
          view: { ...baseItem.view, project: "MX-FFF-GGG-HHH-III-JJJ" },
        },
        {
          type: "vector",
          roles: { editor: "user_a", editors: [] },
        },
        settings,
      ),
    ).toBe(false);
  });

  it("initializes edit UI state before remote checks", () => {
    const settings = {
      mode: { static: false },
      user: { id: "user_a", roles: { developer: true } },
    };
    expect(getInitialEditState(baseItem, settings)).toBe("loading");
    expect(
      getInitialEditState(baseItem, {
        ...settings,
        user: { id: "user_a", roles: { developer: false } },
      }),
    ).toBe("loading");
    expect(
      getInitialEditState(baseItem, {
        ...settings,
        mode: { static: true },
      }),
    ).toBe("hidden");
  });

  it("maps resolved edit checks to menu button states", () => {
    const settings = {
      project: { id: idProject },
      user: {
        id: "user_a",
        roles: {
          developer: true,
          groups: ["editors"],
        },
      },
    };
    const summary = {
      type: "vector",
      roles: { editor: "other", editors: ["editors"] },
    };
    expect(
      getResolvedEditState({
        item: baseItem,
        summary,
        settings,
        editLocked: false,
      }),
    ).toBe("enabled");
    expect(
      getResolvedEditState({
        item: baseItem,
        summary,
        settings,
        editLocked: true,
      }),
    ).toBe("locked");
    expect(
      getResolvedEditState({
        item: baseItem,
        summary: { type: "vector", roles: { editor: "other", editors: [] } },
        settings,
        editLocked: false,
      }),
    ).toBe("unavailable");
    expect(
      getResolvedEditState({
        item: baseItem,
        summary,
        settings: {
          ...settings,
          user: {
            ...settings.user,
            roles: { ...settings.user.roles, developer: false },
          },
        },
        editLocked: false,
      }),
    ).toBe("restricted");
  });

  it("preserves authoritative feature access for restricted source editors", () => {
    expect(canFetchAuthoritativeFeature("restricted")).toBe(true);
    expect(canFetchAuthoritativeFeature("enabled")).toBe(true);
    expect(canFetchAuthoritativeFeature("unavailable")).toBe(false);
    expect(canFetchAuthoritativeFeature("loading")).toBe(false);
  });

  it("resolves edit state asynchronously and falls back to unavailable", async () => {
    const settings = {
      mode: { static: false },
      project: { id: idProject },
      user: {
        id: "user_a",
        roles: {
          developer: true,
          groups: ["editors"],
        },
      },
    };
    const summary = {
      type: "vector",
      roles: { editor: "other", editors: ["editors"] },
    };
    await expect(
      resolveEditState({
        item: baseItem,
        settings,
        getSummary: async () => summary,
        isLocked: async () => false,
      }),
    ).resolves.toBe("enabled");
    await expect(
      resolveEditState({
        item: baseItem,
        settings,
        getSummary: async () => summary,
        isLocked: async () => true,
      }),
    ).resolves.toBe("locked");
    await expect(
      resolveEditState({
        item: baseItem,
        settings,
        getSummary: async () => {
          throw new Error("summary failed");
        },
        isLocked: async () => false,
      }),
    ).resolves.toBe("unavailable");
    const isLocked = vi.fn(async () => false);
    await expect(
      resolveEditState({
        item: baseItem,
        settings,
        getSummary: async () => ({
          type: "vector",
          roles: { editor: "other", editors: [] },
        }),
        isLocked,
      }),
    ).resolves.toBe("unavailable");
    expect(isLocked).not.toHaveBeenCalled();
  });

  it("resolves source access but skips lock checks for non-developers", async () => {
    const getSummary = vi.fn(async () => ({
      type: "vector",
      roles: { editor: "user_a", editors: [] },
    }));
    const isLocked = vi.fn();

    await expect(
      resolveEditState({
        item: baseItem,
        settings: {
          mode: { static: false },
          project: { id: idProject },
          user: { id: "user_a", roles: { developer: false } },
        },
        getSummary,
        isLocked,
      }),
    ).resolves.toBe("restricted");
    expect(getSummary).toHaveBeenCalledOnce();
    expect(isLocked).not.toHaveBeenCalled();
  });

  it("resolves timed-out edit checks as unavailable", async () => {
    vi.useFakeTimers();
    const settings = {
      mode: { static: false },
      project: { id: idProject },
      user: {
        id: "user_a",
        roles: {
          developer: true,
          groups: ["editors"],
        },
      },
    };
    const isLocked = vi.fn(async () => false);
    const promise = resolveEditState({
      item: baseItem,
      settings,
      getSummary: () => new Promise(() => {}),
      isLocked,
      timeoutMs: 10,
    });
    vi.advanceTimersByTime(10);
    await expect(promise).resolves.toBe("unavailable");
    expect(isLocked).not.toHaveBeenCalled();
  });

  it("builds feature GeoJSON and strips geom from properties", () => {
    const feature = buildFeatureGeoJSON(baseItem, {
      gid: 12,
      name: "A",
      geom: { type: "Point", coordinates: [3, 4] },
    });
    expect(feature.geometry).toEqual({ type: "Point", coordinates: [3, 4] });
    expect(feature.properties).toEqual({ gid: 12, name: "A" });
  });

  it("builds stable feature download filenames", () => {
    expect(buildFeatureFilename(baseItem)).toBe("layer_title_12.geojson");
  });
});
