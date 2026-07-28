import { describe, expect, it, vi } from "vitest";

import {
  applyGeometrySave,
  getCircleCompatibleSelectModes,
  getCompleteFeatureCollection,
  getEditableGeometryType,
  getFeatureCollectionGeometryHash,
  getGeometryFocus,
  isCompleteGeometry,
  prepareGeometryForSave,
  splitFeatureForEditing,
} from "./edit_session.js";

const geometries = {
  Point: [1, 2],
  MultiPoint: [
    [1, 2],
    [3, 4],
  ],
  LineString: [
    [0, 0],
    [1, 1],
  ],
  MultiLineString: [
    [
      [0, 0],
      [1, 1],
    ],
  ],
  Polygon: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  ],
  MultiPolygon: [
    [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  ],
};

describe("geometry edit helpers", () => {
  it.each([
    ["Point", "point"],
    ["MultiPoint", "point"],
    ["LineString", "line"],
    ["MultiLineString", "line"],
    ["Polygon", "polygon"],
    ["MultiPolygon", "polygon"],
  ])("maps %s to %s", (type, simpleType) => {
    const geometry = { type, coordinates: geometries[type] };
    expect(getEditableGeometryType(geometry)).toBe(simpleType);
    expect(isCompleteGeometry(geometry)).toBe(true);
  });

  it("rejects collections and incomplete draw placeholders", () => {
    expect(
      getEditableGeometryType({
        type: "GeometryCollection",
        geometries: [],
      }),
    ).toBeNull();
    expect(
      isCompleteGeometry({ type: "Polygon", coordinates: [[]] }),
    ).toBe(false);
    expect(
      isCompleteGeometry({ type: "LineString", coordinates: [[0, 0]] }),
    ).toBe(false);
  });

  it("filters placeholders and ignores volatile ids in history hashes", () => {
    const point = { type: "Point", coordinates: [1, 2] };
    const dataA = {
      type: "FeatureCollection",
      features: [
        { id: "a", type: "Feature", properties: {}, geometry: point },
        {
          id: "pending",
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [[]] },
        },
      ],
    };
    const dataB = {
      type: "FeatureCollection",
      features: [
        { id: "b", type: "Feature", properties: {}, geometry: point },
      ],
    };

    expect(getCompleteFeatureCollection(dataA).features).toHaveLength(1);
    expect(getFeatureCollectionGeometryHash(dataA)).toBe(
      getFeatureCollectionGeometryHash(dataB),
    );
  });

  it("calculates focus for points and multipart bounds", () => {
    expect(getGeometryFocus(null)).toBeNull();
    expect(
      getGeometryFocus({ type: "Point", coordinates: [6, 46] }),
    ).toEqual({
      bounds: [
        [6, 46],
        [6, 46],
      ],
      center: [6, 46],
      isPoint: true,
    });
    expect(
      getGeometryFocus({
        type: "MultiPoint",
        coordinates: [
          [5, 45],
          [7, 47],
        ],
      }),
    ).toEqual({
      bounds: [
        [5, 45],
        [7, 47],
      ],
      center: [6, 46],
      isPoint: false,
    });
  });

  it.each([
    ["MultiPoint", "Point"],
    ["MultiLineString", "LineString"],
    ["MultiPolygon", "Polygon"],
  ])("splits %s into independently editable %s features", (multi, simple) => {
    const source = {
      type: "Feature",
      properties: { gid: 7 },
      geometry: {
        type: multi,
        coordinates: [geometries[multi][0], geometries[multi][0]],
      },
    };

    const parts = splitFeatureForEditing(source);

    expect(parts).toHaveLength(2);
    expect(parts.every((part) => part.geometry.type === simple)).toBe(true);
    expect(parts.every((part) => part.properties.gid === 7)).toBe(true);
  });
});

describe("prepareGeometryForSave", () => {
  const pointFeature = (coordinates) => ({
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates },
  });

  it("never turns an incomplete replacement into null", () => {
    const result = prepareGeometryForSave(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Polygon", coordinates: [[]] },
          },
        ],
      },
      { type: "polygon", allowMultipart: true, promoteToMulti: true },
    );

    expect(result).toEqual({ status: "incomplete" });
    expect(result).not.toHaveProperty("geometry");
  });

  it("rejects an incomplete additional part beside valid data", () => {
    const result = prepareGeometryForSave(
      {
        type: "FeatureCollection",
        features: [
          pointFeature([1, 2]),
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [] },
          },
        ],
      },
      { type: "point", allowMultipart: true, promoteToMulti: true },
    );

    expect(result.status).toBe("incomplete");
  });

  it("allows an explicitly empty collection to save null", () => {
    expect(
      prepareGeometryForSave(
        { type: "FeatureCollection", features: [] },
        { type: "point", allowMultipart: true, promoteToMulti: true },
      ),
    ).toEqual({ status: "valid", geometry: null });
  });

  it("allows only an untouched initial placeholder to remain null", () => {
    const placeholder = (coordinates) => ({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        },
      ],
    });
    const policy = {
      type: "line",
      allowMultipart: true,
      promoteToMulti: true,
      allowEmptyPlaceholder: true,
    };

    expect(prepareGeometryForSave(placeholder([]), policy)).toEqual({
      status: "valid",
      geometry: null,
    });
    expect(
      prepareGeometryForSave(placeholder([[0, 0]]), policy),
    ).toEqual({
      status: "incomplete",
    });
  });

  it("assembles and promotes multiple same-family parts", () => {
    expect(
      prepareGeometryForSave(
        {
          type: "FeatureCollection",
          features: [pointFeature([1, 2]), pointFeature([3, 4])],
        },
        { type: "point", allowMultipart: true, promoteToMulti: true },
      ),
    ).toEqual({
      status: "valid",
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
    });
  });

  it.each([
    [
      "line",
      "LineString",
      "MultiLineString",
      [
        [0, 0],
        [1, 1],
      ],
    ],
    [
      "polygon",
      "Polygon",
      "MultiPolygon",
      [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    ],
  ])(
    "assembles multiple %s parts as %s",
    (family, simpleType, multiType, coordinates) => {
      const makeFeature = () => ({
        type: "Feature",
        properties: {},
        geometry: { type: simpleType, coordinates },
      });

      expect(
        prepareGeometryForSave(
          {
            type: "FeatureCollection",
            features: [makeFeature(), makeFeature()],
          },
          { type: family, allowMultipart: true, promoteToMulti: true },
        ).geometry,
      ).toEqual({
        type: multiType,
        coordinates: [coordinates, coordinates],
      });
    },
  );

  it("flattens already-combined and simple parts together", () => {
    expect(
      prepareGeometryForSave(
        {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "MultiPoint",
                coordinates: [
                  [1, 2],
                  [3, 4],
                ],
              },
            },
            pointFeature([5, 6]),
          ],
        },
        { type: "point", allowMultipart: true, promoteToMulti: true },
      ).geometry,
    ).toEqual({
      type: "MultiPoint",
      coordinates: [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
    });
  });

  it("promotes one part for generic and multipart columns", () => {
    expect(
      prepareGeometryForSave(
        {
          type: "FeatureCollection",
          features: [pointFeature([1, 2])],
        },
        { type: "point", allowMultipart: true, promoteToMulti: true },
      ).geometry,
    ).toEqual({ type: "MultiPoint", coordinates: [[1, 2]] });
  });

  it("rejects multiple parts for explicitly simple columns", () => {
    expect(
      prepareGeometryForSave(
        {
          type: "FeatureCollection",
          features: [pointFeature([1, 2]), pointFeature([3, 4])],
        },
        { type: "point", allowMultipart: false, promoteToMulti: false },
      ),
    ).toEqual({ status: "multipart_not_allowed" });
  });

  it("rejects mixed geometry families", () => {
    expect(
      prepareGeometryForSave(
        {
          type: "FeatureCollection",
          features: [
            pointFeature([1, 2]),
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  [0, 0],
                  [1, 1],
                ],
              },
            },
          ],
        },
        { type: "point", allowMultipart: true, promoteToMulti: true },
      ),
    ).toEqual({ status: "incompatible" });
  });

  it("does not invoke persistence for an incomplete replacement", async () => {
    const onSave = vi.fn();
    const result = await applyGeometrySave(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [[0, 0]] },
          },
        ],
      },
      { type: "line", allowMultipart: false, promoteToMulti: false },
      onSave,
    );

    expect(result).toEqual({ status: "incomplete" });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not persist a cursor-preview line while drawing is active", async () => {
    const onSave = vi.fn();
    const data = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
        },
      ],
    };
    const policy = {
      type: "line",
      allowMultipart: true,
      promoteToMulti: true,
      activeMode: "draw_line_string",
    };

    const result = await applyGeometrySave(data, policy, onSave);

    expect(result).toEqual({ status: "active_drawing" });
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each([
    "draw_point",
    "draw_line_string",
    "draw_polygon",
    "draw_circle",
  ])("rejects the %s mode before inspecting geometry", async (activeMode) => {
    const onSave = vi.fn();
    const result = await applyGeometrySave(
      { type: "FeatureCollection", features: [] },
      {
        type: "point",
        allowMultipart: true,
        promoteToMulti: true,
        allowEmptyPlaceholder: true,
        activeMode,
      },
      onSave,
    );

    expect(result).toEqual({ status: "active_drawing" });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("persists the same complete-looking line after drawing finishes", async () => {
    const onSave = vi.fn();
    const result = await applyGeometrySave(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0],
                [1, 1],
              ],
            },
          },
        ],
      },
      {
        type: "line",
        allowMultipart: true,
        promoteToMulti: true,
        activeMode: "simple_select",
      },
      onSave,
    );

    expect(result.status).toBe("saved");
    expect(onSave).toHaveBeenCalledWith(result);
  });

  it("still persists an explicit empty geometry from a settled mode", async () => {
    const onSave = vi.fn();
    const result = await applyGeometrySave(
      { type: "FeatureCollection", features: [] },
      {
        type: "point",
        allowMultipart: true,
        promoteToMulti: true,
        activeMode: "simple_select",
      },
      onSave,
    );

    expect(result).toEqual({ status: "saved", geometry: null });
    expect(onSave).toHaveBeenCalledWith(result);
  });

  it("invokes persistence with an assembled multipart geometry", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const result = await applyGeometrySave(
      {
        type: "FeatureCollection",
        features: [pointFeature([1, 2]), pointFeature([3, 4])],
      },
      { type: "point", allowMultipart: true, promoteToMulti: true },
      onSave,
    );

    expect(result).toEqual({
      status: "saved",
      geometry: {
        type: "MultiPoint",
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
    });
    expect(onSave).toHaveBeenCalledWith(result);
  });
});

describe("circle-compatible draw modes", () => {
  it("keeps current mode behavior except for circle-specific overrides", () => {
    const base = {
      direct_select: {
        onTrash: vi.fn(),
        dragFeature: vi.fn(),
        dragVertex: vi.fn(),
        toDisplayFeatures: vi.fn(),
      },
      simple_select: {
        onStop: vi.fn(),
        dragMove: vi.fn(),
        toDisplayFeatures: vi.fn(),
      },
    };
    const circle = {
      DirectMode: {
        dragFeature: vi.fn(),
        dragVertex: vi.fn(),
        toDisplayFeatures: vi.fn(),
      },
      SimpleSelectMode: {
        dragMove: vi.fn(),
        toDisplayFeatures: vi.fn(),
      },
    };

    const modes = getCircleCompatibleSelectModes(base, circle);

    expect(modes.direct_select.onTrash).toBe(base.direct_select.onTrash);
    expect(modes.direct_select.dragVertex).toBe(circle.DirectMode.dragVertex);
    expect(modes.simple_select.onStop).toBe(base.simple_select.onStop);
    expect(modes.simple_select.dragMove).toBe(circle.SimpleSelectMode.dragMove);
  });
});
