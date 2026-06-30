import { describe, expect, it } from "vitest";
import {
  buildFeatureFilename,
  buildFeatureGeoJSON,
  canAttemptEdit,
  canEditFromSummary,
  collectFeatureItems,
  formatCoordinates,
  getGeometryType,
} from "./helpers";
import type { MapContextMenuDependencies } from "./types";

const baseItem = {
  idView: "MX-AAA-BBB-CCC",
  view: {
    id: "MX-AAA-BBB-CCC",
    type: "vt",
    project: "project_a",
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

const deps = {
  clone: (value: any) => JSON.parse(JSON.stringify(value)),
  eventToPointBbox: () => [0, 0, 1, 1],
  getFeaturesAtBbox: (_map: any, _bbox: any, idView: string) => [
    { id: 1, properties: { gid: 1, label: `${idView}-1` }, geometry: null },
    { id: 2, properties: { gid: 2, label: `${idView}-2` }, geometry: null },
  ],
  getLayerNamesByPrefix: () => ["view_b", "view_a"],
  getView: (id: string) => ({
    id,
    type: "vt",
    project: "project_a",
    data: {
      source: {
        layerInfo: {
          name: "mx_vector_a_b_c_d_e",
        },
      },
    },
  }),
  getViewTitle: (view: any) => `Title ${view.id}`,
  getViewsOrder: () => ["view_a", "view_b"],
  isView: (view: any) => !!view?.id,
  path: (obj: any, key: string) =>
    key.split(".").reduce((out, part) => out?.[part], obj),
  setFeatureIdentityProperty: () => {},
  sortByOrder: (items: string[], order: string[]) =>
    [...items].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
} as Pick<
  MapContextMenuDependencies,
  | "clone"
  | "eventToPointBbox"
  | "getFeaturesAtBbox"
  | "getLayerNamesByPrefix"
  | "getView"
  | "getViewTitle"
  | "getViewsOrder"
  | "isView"
  | "path"
  | "setFeatureIdentityProperty"
  | "sortByOrder"
>;

describe("map context menu helpers", () => {
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
      deps,
      maxItems: 3,
    });
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.idView)).toEqual([
      "view_a",
      "view_a",
      "view_b",
    ]);
  });

  it("gates edit attempts before remote role checks", () => {
    const opt = {
      isNotEmpty: (value: any) => value !== null && value !== undefined && value !== "",
      isNumeric: (value: any) =>
        value !== null && value !== "" && Number.isFinite(Number(value)),
      isSourceId: (value: any) => typeof value === "string" && value.startsWith("mx_"),
      isView: (value: any) => !!value?.id,
      settings: {
        mode: { static: false },
        user: { id: "user_a" },
      },
    };
    expect(canAttemptEdit(baseItem, opt)).toBe(true);
    expect(
      canAttemptEdit(
        {
          ...baseItem,
          gid: null,
        },
        opt,
      ),
    ).toBe(false);
    expect(
      canAttemptEdit(baseItem, {
        ...opt,
        settings: { ...opt.settings, mode: { static: true } },
      }),
    ).toBe(false);
  });

  it("resolves edit permission from source summary and user roles", () => {
    const settings = {
      project: { id: "project_a" },
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
        { ...baseItem, view: { ...baseItem.view, project: "project_b" } },
        {
          type: "vector",
          roles: { editor: "user_a", editors: [] },
        },
        settings,
      ),
    ).toBe(false);
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
    expect(
      buildFeatureFilename(baseItem, {
        isNotEmpty: (value: any) => value !== null && value !== undefined && value !== "",
        makeSafeName: (value: string) => value.toLowerCase().replaceAll(" ", "_"),
      }),
    ).toBe("layer_title_12.geojson");
  });
});
