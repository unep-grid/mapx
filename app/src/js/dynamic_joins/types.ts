// Core filter types
export interface StaticFilter {
  field: string;
  operator: string;
  value: any;
}

export interface DynamicFilter {
  name: string;
  type: 'dropdown' | 'slider';
  default?: any;
  [key: string]: any;
}

export interface CompiledFilter {
  field: string;
  op: (a: any, b: any) => boolean;
  value: any;
}

// Paint configuration for different layer types
export interface PaintConfig {
  circle?: Record<string, any>;
  fill?: {
    'fill-color'?: string;
    'fill-opacity'?: number;
    'fill-outline-color'?: string;
    [key: string]: any;
  };
  line?: Record<string, any>;
}

// Data types
export interface AggregatedTableEntry {
  key: string;
  value: any;
}

// Forward declaration for DynamicJoin class
export interface DynamicJoin {
  // This will be filled by the actual class
}

// Main options interface
export interface DynamicJoinOptions {
  elSelectContainer: HTMLElement | null;
  elLegendContainer: HTMLElement | null;
  idSourceGeom: string | null;
  idSourceData: string | null;
  sourceLayer: string | null;
  dataUrl: string | null;
  data: any[];
  tilesUrl: string[] | null;
  palette: string;
  stat: 'q' | 'e' | 'l' | 'k';
  classes: number;
  color_na: string;
  aggregateFn: string;
  layerPrefix: string;
  field: string | null;
  fieldJoinData: string | null;
  fieldJoinGeom: string | null;
  type: 'fill' | 'circle' | 'line';
  paint: PaintConfig;
  staticFilters: StaticFilter[];
  dynamicFilters: DynamicFilter[];
  onTableAggregated: (table: AggregatedTableEntry[], instance: DynamicJoin) => void;
  onTableReady: (table: any[], instance: DynamicJoin) => void;
  onTableFiltered: (table: any[], instance: DynamicJoin) => void;
  onMapClick: (features: any[], instance: DynamicJoin, event: any) => void;
}

// Internal state interface
export interface DynamicJoinState {
  _options: DynamicJoinOptions;
  _table_raw: any[];
  _table_filtered: any[];
  _table_base: any[];
  _aggregated_lookup: Map<string, any>;
  _color_scale: chroma.Scale | null;
  _filters_controls: Record<string, any>;
  _current_filters: Record<string, any>;
  _visible_legend_classes: Set<number | string>;
  _id_layer: string | null;
  _id_source: string | null;
}

// UI control types
export interface FilterControl {
  destroy?: () => void;
  [key: string]: any;
}

export interface LegendUIOptions {
  colorScale?: chroma.Scale;
  data?: Array<{ key: string; value: any }>;
  color_na?: string;
  onToggle?: (classIdentifier: number | string, isVisible: boolean, allVisibleClasses: Set<number | string>) => void;
}

// Builder function options
export interface BuildSliderOptions {
  elWrapper: HTMLElement;
  data: any[];
  config: DynamicFilter & {
    min?: number | 'auto';
    max?: number | 'auto';
    step?: number;
    integer?: boolean;
    single?: boolean;
  };
  onBuilt: (slider: any, name: string) => void;
  onUpdate: (values: number[], name: string) => void;
}

export interface BuildTomSelectOptions {
  elWrapper: HTMLElement;
  data: any[];
  config: DynamicFilter;
  onBuilt: (tomSelect: any, name: string) => void;
  onUpdate: (value: any, name: string) => void;
}

export interface BuildLegendOptions {
  elWrapper: HTMLElement;
  config: {
    colorScale: chroma.Scale;
    color_na: string;
  };
  data: AggregatedTableEntry[];
  onBuilt: (legend: any) => void;
  onUpdate: (classIndex: any, isVisible: any, allVisibleClasses: Set<number | string>) => void;
}

// Data series types
export interface SeriesDataPoint {
  did: number;
  value: number;
  year: number;
  team: string;
  scenario: string;
  variable: string;
}

// Function types
export type AggregatorFunction = (vals: any[]) => any;

// Map type - using any for now to avoid complex Mapbox GL JS typing
export type MapInstance = any;
