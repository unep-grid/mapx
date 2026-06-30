export type AnyRecord = Record<string, any>;

export interface MapContextMenuPoint {
  x: number;
  y: number;
}

export interface MapContextMenuLngLat {
  lng: number;
  lat: number;
}

export interface MapContextMenuEvent {
  point: MapContextMenuPoint;
  lngLat: MapContextMenuLngLat;
  originalEvent?: MouseEvent;
  preventDefault?: () => void;
}

export interface MapContextMenuMap {
  getContainer: () => HTMLElement;
  on: (type: string, callback: () => void) => void;
  off: (type: string, callback: () => void) => void;
}

export interface RenderedFeature {
  id?: string | number;
  properties?: AnyRecord;
  geometry?: AnyRecord | null;
}

export interface MapContextMenuItem {
  idView: string;
  view: AnyRecord;
  gid?: string | number;
  idSource?: string;
  title: string;
  properties: AnyRecord;
  geometry: AnyRecord | null;
  canEdit?: boolean;
}

export interface SourceSummary {
  type?: string;
  roles?: {
    editor?: string | number;
    editors?: Array<string | number>;
  };
}

export interface MapContextMenuDependencies {
  clone: <T>(value: T) => T;
  copyToClipboard: (text: string) => Promise<void>;
  downloadJSON: (data: AnyRecord, filename: string) => Promise<boolean>;
  draw: AnyRecord;
  el: (...args: any[]) => HTMLElement;
  eventToPointBbox: (event: MapContextMenuEvent) => AnyRecord;
  getFeaturesAtBbox: (
    map: MapContextMenuMap,
    bbox: AnyRecord,
    prefix?: string,
  ) => RenderedFeature[];
  getLayerNamesByPrefix: (opt: AnyRecord) => string[];
  getView: (idView: string) => AnyRecord;
  getViewSourceSummary: (idView: string, opt: AnyRecord) => Promise<SourceSummary>;
  getViewTitle: (view: AnyRecord) => string;
  getViewsOrder: () => string[];
  isEmpty: (value: any) => boolean;
  isNotEmpty: (value: any) => boolean;
  isNumeric: (value: any) => boolean;
  isSourceId: (value: any) => boolean;
  isView: (value: any) => boolean;
  makeId: () => string;
  makeSafeName: (value: string) => string;
  modalDialog: (opt: AnyRecord) => Promise<any>;
  panels: AnyRecord;
  path: (obj: AnyRecord, path: string, fallback?: any) => any;
  QuickGeometryEditSession: new (config: AnyRecord) => AnyRecord;
  settings: AnyRecord;
  setFeatureIdentityProperty: (properties: AnyRecord | undefined, id: any) => void;
  sortByOrder: (items: string[], order: string[]) => string[];
  viewsReplace: (views: AnyRecord[]) => Promise<boolean>;
}
