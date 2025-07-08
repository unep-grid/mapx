# Dynamic Joins

A TypeScript module for creating interactive, data-driven map visualizations by joining tabular data with vector geometries. Supports dynamic filtering, statistical classification, and interactive legends.

## Overview

Dynamic Joins enables you to:
- Join tabular data with vector tile geometries
- Apply statistical classification methods to create choropleth maps
- Add interactive filters (dropdowns, sliders) for data exploration
- Generate dynamic legends with class toggling
- Aggregate data using various statistical methods

## Core Options

### Statistical Classification (`stat`)

Controls how data values are classified into color classes:

- `'q'` - **Quantile** (default): Equal number of features per class
- `'e'` - **Equal interval**: Equal value ranges per class
- `'l'` - **Logarithmic**: Logarithmic scale breaks
- `'k'` - **K-means**: K-means clustering algorithm

### Aggregation Methods (`aggregateFn`)

When multiple data rows match a single geometry, values are aggregated using:

- `'none'` - No aggregation (warns if multiple values found)
- `'first'` - First value encountered
- `'last'` - Last value encountered
- `'sum'` - Sum of all values
- `'max'` - Maximum value
- `'min'` - Minimum value
- `'median'` - Median value
- `'mode'` - Most frequent value

### Layer Types (`type`)

Supported map layer types:

- `'fill'` - Polygon fills (choropleth maps)
- `'circle'` - Point circles
- `'line'` - Line styling

### Dynamic Filters (`dynamicFilters`)

Interactive filter controls:

- `'dropdown'` - Select from unique field values
- `'slider'` - Range or single value selection with min/max bounds

## Required Parameters

```typescript
{
  idSourceGeom: string,        // Vector source ID
  fieldJoinData: string,       // Join field in data table
  fieldJoinGeom: string,       // Join field in geometry
  dataUrl: string | data: []   // Data source (URL or array)
}
```

## Basic Usage

### Standard Usage

```typescript
import { DynamicJoin } from './dynamic_joins';

const dynamicJoin = new DynamicJoin(map);

await dynamicJoin.init({
  // Required
  idSourceGeom: 'my-vector-source',
  fieldJoinData: 'region_id',
  fieldJoinGeom: 'id',
  dataUrl: 'https://api.example.com/data.json',

  // Join type
  joinType: 'left',            // 'left' (show all) or 'inner' (matched only)

  // Styling
  stat: 'q',                   // quantile classification
  classes: 5,                  // number of color classes
  palette: 'OrRd',             // chroma.js color palette
  aggregateFn: 'sum',          // aggregate multiple values
  field: 'population',         // value field to visualize

  // Filters
  dynamicFilters: [
    {
      name: 'year',
      type: 'dropdown'
    },
    {
      name: 'temperature',
      type: 'slider',
      min: 0,
      max: 100
    }
  ],

  // UI containers
  elLegendContainer: document.getElementById('legend'),
  elSelectContainer: document.getElementById('filters')
});
```

### MapX Integration (NEW)

For MapX projects, you can use the simplified API with automatic URL construction and data fetching using granular control flags:

```typescript
// Both MapX data and tiles
await dynamicJoin.init({
  useApiMapxData: true,   // Enable MapX data fetching
  useApiMapxTiles: true,  // Enable MapX tile URL construction

  // Required MapX options
  idSourceData: 'mx_data_source_id',
  idSourceGeom: 'mx_geom_source_id',
  fieldJoinData: 'region_id',
  fieldJoinGeom: 'id',
  field: 'population',

  // Optional: specify fields to fetch
  fieldsData: ['region_id', 'population', 'year'],
  fieldsGeom: ['id', 'name'],

  // All other options work the same
  stat: 'q',
  classes: 5,
  palette: 'OrRd',
  dynamicFilters: [
    { name: 'year', type: 'dropdown' }
  ]
});
```

**Edge Cases - Mixed Data Sources:**

```typescript
// MapX data + External tiles
await dynamicJoin.init({
  useApiMapxData: true,
  useApiMapxTiles: false,
  idSourceData: 'mx_data_id',
  tilesUrl: ['https://external-tiles.com/{z}/{x}/{y}'],
  sourceLayer: 'external_layer',
  // ...
});

// External data + MapX tiles
await dynamicJoin.init({
  useApiMapxData: false,
  useApiMapxTiles: true,
  dataUrl: 'https://external-api.com/data.json',
  idSourceGeom: 'mx_geom_id',
  // ...
});
```

**Benefits of MapX Integration:**
- **Granular Control**: Separate flags for data and tiles
- **Mixed Sources**: Support for real-world edge cases
- **Automatic URL Construction**: Using MapX API routes when enabled
- **Automatic Data Fetching**: From MapX backend when enabled
- **No Manual Setup**: Eliminates boilerplate code
- **Backward Compatible**: Existing configurations continue to work

## Configuration Options

### Color and Styling

- `palette: string` - Chroma.js color palette name or array of colors
- `classes: number` - Number of classification classes (default: 5)
- `colorNa: string` - Color for missing/null values (default: '#ccc')
- `paint: PaintConfig` - Mapbox GL paint properties per layer type

### Data Source

- `dataUrl: string` - URL to fetch JSON data
- `data: any[]` - Direct data array (alternative to dataUrl)
- `tilesUrl: string[]` - Vector tile URLs
- `sourceLayer: string` - Source layer name within vector tiles

### Static Filtering

- `staticFilters: StaticFilter[]` - Pre-filter data before visualization

```typescript
staticFilters: [
  { field: 'country', operator: '==', value: 'USA' },
  { field: 'year', operator: '>=', value: 2020 }
]
```

### Event Callbacks

- `onTableReady(table, instance)` - Called after static filtering
- `onTableFiltered(table, instance)` - Called after dynamic filtering
- `onTableAggregated(table, instance)` - Called after aggregation
- `onMapClick(features, instance, event)` - Called on map feature click

## Data Structure

The module supports two data formats for both direct data and URL-fetched data:

**Format 1: Wrapped in data property**
```json
{
  "data": [
    {
      "region_id": "US-CA",
      "population": 39538223,
      "year": 2020,
      "category": "state"
    }
  ]
}
```

**Format 2: Direct array**
```json
[
  {
    "region_id": "US-CA",
    "population": 39538223,
    "year": 2020,
    "category": "state"
  }
]
```

## Methods

### Data Access

- `getTableRaw()` - Original unfiltered data
- `getTableBase()` - Data after static filtering
- `getTableFiltered()` - Data after dynamic filtering
- `getTableAggregated()` - Final aggregated data
- `getCurrentFilters()` - Current filter values

### Control

- `refresh()` - Manually trigger data processing and map update
- `destroy()` - Clean up resources and remove from map

## Filter Configuration

### Dropdown Filter

```typescript
{
  name: 'category',
  type: 'dropdown',
  default: 'all'
}
```

### Slider Filter

```typescript
{
  name: 'value_range',
  type: 'slider',
  min: 0,           // or 'auto'
  max: 1000,        // or 'auto'
  step: 10,
  single: false,    // true for single value, false for range
  integer: true     // force integer values
}
```

## Advanced Usage

### Custom Paint Properties

```typescript
paint: {
  fill: {
    'fill-opacity': 0.8,
    'fill-outline-color': '#000'
  },
  circle: {
    'circle-radius': 5,
    'circle-stroke-width': 1
  }
}
```

### Multiple Data Sources

The module supports both URL-based and direct data loading:

```typescript
// URL-based
{ dataUrl: 'https://api.example.com/data.json' }

// Direct data
{ data: myDataArray }
```
