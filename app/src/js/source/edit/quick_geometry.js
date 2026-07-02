import { EditChannel } from "./channel.js";

/**
 * Lightweight edit session for quick geometry edits ( map context menu ).
 * All behavior lives in EditChannel : this named class only keeps the
 * intent explicit at the call sites.
 */
export class QuickGeometryEditSession extends EditChannel {}
