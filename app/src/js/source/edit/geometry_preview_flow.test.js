import { describe, expect, it, vi } from "vitest";

import { previewTableFeatureGeometry } from "./geometry_preview_flow.js";

function createEditor(getFeature) {
  const handlers = new Map();
  return {
    handlers,
    getFeature,
    on: vi.fn((type, callback) => handlers.set(type, callback)),
  };
}

function createDraw() {
  return {
    showGeometryPreview: vi.fn(() => true),
    clearGeometryPreview: vi.fn(() => true),
  };
}

describe("previewTableFeatureGeometry", () => {
  it("binds cleanup before fetching and ignores results after destruction", async () => {
    let resolveFeature;
    const editor = createEditor(
      () => new Promise((resolve) => (resolveFeature = resolve)),
    );
    const draw = createDraw();

    const pending = previewTableFeatureGeometry(editor, draw, 7);
    expect(editor.on).toHaveBeenCalledWith("destroy", expect.any(Function));
    editor._destroying = true;
    editor.handlers.get("destroy")();
    resolveFeature({ geom: { type: "Point", coordinates: [0, 0] } });

    await expect(pending).resolves.toBe(false);
    expect(draw.showGeometryPreview).not.toHaveBeenCalled();
    expect(draw.clearGeometryPreview).toHaveBeenCalledWith(
      editor._geometryPreviewOwner,
    );
  });

  it("passes a stable editor ownership token to display and cleanup", async () => {
    const geometry = { type: "Point", coordinates: [0, 0] };
    const editor = createEditor(vi.fn().mockResolvedValue({ geom: geometry }));
    const draw = createDraw();

    await previewTableFeatureGeometry(editor, draw, 7, { maxZoom: 12 });

    const owner = editor._geometryPreviewOwner;
    expect(draw.showGeometryPreview).toHaveBeenCalledWith(geometry, {
      maxZoom: 12,
      owner,
    });
    editor.handlers.get("destroy")();
    expect(draw.clearGeometryPreview).toHaveBeenCalledWith(owner);
  });

  it("ignores a slower result superseded by a newer request", async () => {
    let resolveFirst;
    const secondGeometry = { type: "Point", coordinates: [2, 3] };
    const getFeature = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve)),
      )
      .mockResolvedValueOnce({ geom: secondGeometry });
    const editor = createEditor(getFeature);
    const draw = createDraw();

    const first = previewTableFeatureGeometry(editor, draw, 1);
    const second = previewTableFeatureGeometry(editor, draw, 2);
    await second;
    resolveFirst({ geom: { type: "Point", coordinates: [0, 0] } });

    await expect(first).resolves.toBe(false);
    expect(draw.showGeometryPreview).toHaveBeenCalledTimes(1);
    expect(draw.showGeometryPreview).toHaveBeenCalledWith(
      secondGeometry,
      expect.any(Object),
    );
  });
});
