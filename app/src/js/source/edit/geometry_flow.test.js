import { beforeEach, describe, expect, it, vi } from "vitest";

const mxMock = vi.hoisted(() => ({
  draw: {
    startEditSession: vi.fn(),
  },
  panels: {
    idExists: vi.fn().mockReturnValue(false),
    isVisible: vi.fn().mockReturnValue(false),
    hide: vi.fn(),
    show: vi.fn(),
  },
}));

vi.mock("../../mx.js", () => mxMock);

vi.mock("../../mx_helper_modal.js", () => ({
  modalDialog: vi.fn().mockResolvedValue(true),
}));

import {
  editFeatureGeometry,
  getGeometryTypeSimple,
  refreshTableViews,
} from "./geometry_flow.js";

describe("getGeometryTypeSimple", () => {
  it("maps geojson types to simple types", () => {
    expect(getGeometryTypeSimple({ type: "MultiPoint" })).toBe("point");
    expect(getGeometryTypeSimple({ type: "LineString" })).toBe("line");
    expect(getGeometryTypeSimple({ type: "MultiPolygon" })).toBe("polygon");
    expect(getGeometryTypeSimple(null)).toBe("polygon");
  });
});

describe("refreshTableViews", () => {
  it("replaces the views used by the source", async () => {
    // minimal object accepted by isView
    const view = {
      id: "MX-ABCDE-FGHIJ-KLMNO",
      project: "MX-ABC-DEF-GHI-JKL-MNO",
      type: "vt",
      data: { title: { en: "test" } },
    };
    const session = {
      getTableViews: vi.fn().mockResolvedValue([{ id: view.id }]),
    };
    const viewsApi = {
      getView: vi.fn().mockReturnValue(view),
      viewsReplace: vi.fn().mockResolvedValue(true),
    };

    await refreshTableViews(session, viewsApi);
    expect(viewsApi.viewsReplace).toHaveBeenCalledWith([view]);
  });

  it("returns false when the source has no views", async () => {
    const session = {
      getTableViews: vi.fn().mockResolvedValue(null),
    };
    const viewsApi = {
      getView: vi.fn(),
      viewsReplace: vi.fn(),
    };
    await expect(refreshTableViews(session, viewsApi)).resolves.toBe(false);
    expect(viewsApi.viewsReplace).not.toHaveBeenCalled();
  });
});

describe("editFeatureGeometry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mxMock.panels.idExists.mockReturnValue(false);
  });

  it("throws when the feature is missing", async () => {
    const session = {
      getFeature: vi.fn().mockResolvedValue(null),
    };
    await expect(
      editFeatureGeometry({ session, gid: 1, viewsApi: {} }),
    ).rejects.toThrow("Feature not found");
    expect(mxMock.draw.startEditSession).not.toHaveBeenCalled();
  });

  it("starts a draw session with the stored geometry and saves", async () => {
    const geom = { type: "Point", coordinates: [0, 0] };
    const session = {
      getFeature: vi.fn().mockResolvedValue({ gid: 7, geom }),
      updateGeometry: vi.fn().mockResolvedValue(true),
      getTableViews: vi.fn().mockResolvedValue(null),
    };
    mxMock.draw.startEditSession.mockImplementation(async ({ onSave }) => {
      await onSave({ geometry: geom });
      return { status: "saved" };
    });

    const result = await editFeatureGeometry({
      session,
      gid: 7,
      viewsApi: { getView: vi.fn(), viewsReplace: vi.fn() },
    });

    expect(result.status).toBe("saved");
    expect(session.updateGeometry).toHaveBeenCalledWith(7, geom);
    const call = mxMock.draw.startEditSession.mock.calls[0][0];
    expect(call.type).toBe("point");
    expect(call.feature.geometry).toBe(geom);
    expect(call.singleFeature).toBe(true);
  });

  it("uses the provided geomType for empty geometries", async () => {
    const session = {
      getFeature: vi.fn().mockResolvedValue({ gid: 7, geom: null }),
      updateGeometry: vi.fn(),
      getTableViews: vi.fn().mockResolvedValue(null),
    };
    mxMock.draw.startEditSession.mockResolvedValue({ status: "cancelled" });

    await editFeatureGeometry({
      session,
      gid: 7,
      geomType: "line",
      viewsApi: {},
    });

    expect(mxMock.draw.startEditSession.mock.calls[0][0].type).toBe("line");
  });

  it("restores the main panel even when the draw session fails", async () => {
    mxMock.panels.idExists.mockReturnValue(true);
    mxMock.panels.isVisible.mockReturnValue(true);
    const session = {
      getFeature: vi.fn().mockResolvedValue({ gid: 7, geom: null }),
    };
    mxMock.draw.startEditSession.mockRejectedValue(new Error("draw failed"));

    await expect(
      editFeatureGeometry({ session, gid: 7, viewsApi: {} }),
    ).rejects.toThrow("draw failed");

    expect(mxMock.panels.hide).toHaveBeenCalledWith("main_panel");
    expect(mxMock.panels.show).toHaveBeenCalledWith("main_panel");
  });
});
