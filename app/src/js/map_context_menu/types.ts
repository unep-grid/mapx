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

export interface MapContextMenuMapApi {
  getFeaturesAtBbox: (
    map: MapContextMenuMap,
    bbox: any,
    prefix?: string,
  ) => RenderedFeature[];
  getLayerNamesByPrefix: (opt: AnyRecord) => string[];
  getView: (idView: string) => AnyRecord;
  getViewSourceSummary: (idView: string, opt: AnyRecord) => Promise<SourceSummary>;
  getViewTitle: (view: AnyRecord) => string;
  getViewsOrder: () => string[];
  viewsReplace: (views: AnyRecord[]) => Promise<boolean>;
}
