/**
 * Fetch and display a table feature while guarding editor lifecycle and
 * concurrent requests. Each editor receives a stable ownership token so its
 * destroy handler cannot clear another editor's newer preview.
 * @param {Object} editor edit-table session
 * @param {Object} draw MapxDraw instance
 * @param {number|string} gid feature identifier
 * @param {Object} [opt] preview and focus options
 * @returns {Promise<boolean>} whether the feature was displayed
 */
export async function previewTableFeatureGeometry(editor, draw, gid, opt = {}) {
  if (!editor._geometryPreviewOwner) {
    const owner = Symbol("edit-table-geometry-preview");
    editor._geometryPreviewOwner = owner;
    editor.on("destroy", () => {
      editor._geometryPreviewRequest = null;
      draw.clearGeometryPreview(owner);
    });
  }

  const request = Symbol("geometry-preview-request");
  editor._geometryPreviewRequest = request;
  const feature = await editor.getFeature(gid);
  if (
    editor._destroyed ||
    editor._destroying ||
    editor._geometryPreviewRequest !== request ||
    !feature?.geom
  ) {
    return false;
  }

  return draw.showGeometryPreview(feature.geom, {
    ...opt,
    owner: editor._geometryPreviewOwner,
  });
}
