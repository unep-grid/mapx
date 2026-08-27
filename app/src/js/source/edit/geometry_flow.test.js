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

const modalMock = vi.hoisted(() => ({
  modalDialog: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../mx.js", () => mxMock);

vi.mock("../../mx_helper_modal.js", () => modalMock);

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
    expect(getGeometryTypeSimple(null)).toBeNull();
    expect(
      getGeometryTypeSimple({ type: "GeometryCollection", geometries: [] }),
    ).toBeNull();
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
    expect(call.allowMultipart).toBe(false);
    expect(call.promoteToMulti).toBe(false);
    expect(call.maxZoom).toBe(12);
  });

  it("uses the declared generic column policy for multipart editing", async () => {
    const geom = { type: "Point", coordinates: [0, 0] };
    const session = {
      getFeature: vi.fn().mockResolvedValue({ gid: 7, geom }),
      getGeometryInfo: vi.fn().mockResolvedValue({
        type: "GEOMETRY",
        srid: 4326,
        simpleType: "point",
      }),
      updateGeometry: vi.fn(),
      getTableViews: vi.fn().mockResolvedValue(null),
    };
    mxMock.draw.startEditSession.mockResolvedValue({ status: "cancelled" });

    await editFeatureGeometry({
      session,
      gid: 7,
      viewsApi: {},
    });

    const call = mxMock.draw.startEditSession.mock.calls[0][0];
    expect(session.getGeometryInfo).toHaveBeenCalledOnce();
    expect(call.allowMultipart).toBe(true);
    expect(call.promoteToMulti).toBe(true);
  });

  it("uses each stored multipart geometry's own family", async () => {
    const geom = {
      type: "MultiLineString",
      coordinates: [
        [
          [0, 0],
          [1, 1],
        ],
      ],
    };
    const session = {
      getFeature: vi.fn().mockResolvedValue({ gid: 7, geom }),
      updateGeometry: vi.fn(),
      getTableViews: vi.fn().mockResolvedValue(null),
    };
    mxMock.draw.startEditSession.mockResolvedValue({ status: "cancelled" });

    await editFeatureGeometry({
      session,
      gid: 7,
      geomType: "polygon",
      viewsApi: {},
    });

    expect(mxMock.draw.startEditSession.mock.calls[0][0].type).toBe("line");
    expect(mxMock.draw.startEditSession.mock.calls[0][0].feature.geometry).toBe(
      geom,
    );
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

  it("allows multipart drawing for an empty generic geometry row", async () => {
    const session = {
      getFeature: vi.fn().mockResolvedValue({ gid: 7, geom: null }),
      getGeometryInfo: vi.fn().mockResolvedValue({
        type: "GEOMETRY",
        srid: 4326,
        simpleType: "point",
      }),
      updateGeometry: vi.fn(),
      getTableViews: vi.fn().mockResolvedValue(null),
    };
    mxMock.draw.startEditSession.mockResolvedValue({ status: "cancelled" });

    await editFeatureGeometry({
      session,
      gid: 7,
      geomType: "point",
      viewsApi: {},
    });

    expect(mxMock.draw.startEditSession.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        type: "point",
        allowMultipart: true,
        promoteToMulti: true,
      }),
    );
  });

  it("rejects GeometryCollection with a visible message", async () => {
    const geom = {
      type: "GeometryCollection",
      geometries: [{ type: "Point", coordinates: [0, 0] }],
    };
    const session = {
      getFeature: vi.fn().mockResolvedValue({ gid: 7, geom }),
    };

    await expect(
      editFeatureGeometry({
        session,
        gid: 7,
        viewsApi: {},
      }),
    ).rejects.toThrow("Unsupported geometry type: GeometryCollection");

    expect(modalMock.modalDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Unsupported geometry" }),
    );
    expect(mxMock.draw.startEditSession).not.toHaveBeenCalled();
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

  it("restores the main panel before refreshing views after a save", async () => {
    mxMock.panels.idExists.mockReturnValue(true);
    mxMock.panels.isVisible.mockReturnValue(true);
    let resolveTableViews;
    const tableViewsPending = new Promise((resolve) => {
      resolveTableViews = resolve;
    });
    const session = {
      getFeature: vi.fn().mockResolvedValue({ gid: 7, geom: null }),
      getTableViews: vi.fn().mockReturnValue(tableViewsPending),
    };
    mxMock.draw.startEditSession.mockResolvedValue({ status: "saved" });

    let settled = false;
    const editPending = editFeatureGeometry({
      session,
      gid: 7,
      viewsApi: {},
    }).then((result) => {
      settled = true;
      return result;
    });

    await vi.waitFor(() => {
      expect(mxMock.panels.show).toHaveBeenCalledWith("main_panel");
      expect(session.getTableViews).toHaveBeenCalledOnce();
    });
    expect(settled).toBe(false);

    resolveTableViews(null);
    await expect(editPending).resolves.toEqual({ status: "saved" });
  });

  it("keeps the main panel hidden when it was hidden before editing", async () => {
    mxMock.panels.idExists.mockReturnValue(true);
    mxMock.panels.isVisible.mockReturnValue(false);
    const session = {
      getFeature: vi.fn().mockResolvedValue({ gid: 7, geom: null }),
    };
    mxMock.draw.startEditSession.mockResolvedValue({ status: "cancelled" });

    await editFeatureGeometry({ session, gid: 7, viewsApi: {} });

    expect(mxMock.panels.hide).toHaveBeenCalledWith("main_panel");
    expect(mxMock.panels.show).not.toHaveBeenCalled();
  });
});
