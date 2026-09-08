import { EditChannel } from "./channel.js";

/**
 * Lightweight edit session for quick geometry edits ( map context menu ).
 * It extends the shared channel with the geometry-specific permission status.
 */
export class QuickGeometryEditSession extends EditChannel {
  static isStatusLocked(status) {
    return status?.geometryEditAllowed !== true || super.isStatusLocked(status);
  }
}
