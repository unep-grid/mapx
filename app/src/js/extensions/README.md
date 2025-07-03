# Time-Enabled Map Legend Extensions

This directory contains modular extensions for handling time-enabled map services in MapX. The architecture supports both WMTS (Marine Copernicus) and WMS services with temporal dimensions.

## Architecture

The extensions follow an inheritance-based architecture that maximizes code reuse:

```
BaseTimeMapLegend (shared/)
├── TimeMapLegend (cmems/) - CMEMS/WMTS implementation
└── WMSTimeMapLegend (wms/) - Generic WMS implementation
```

### Directory Structure

```
extensions/
├── index.js                           # Main exports
├── shared/                           # Shared base classes
│   └── base_time_map_legend.js      # Base class with common logic
├── cmems/                           # CMEMS/WMTS extension
│   ├── ocean_map_legend.js          # CMEMS implementation
│   ├── example.js                   # Usage examples
│   └── style.less                   # CMEMS-specific styling
└── wms/                             # Generic WMS extension
    ├── wms_time_map_legend.js       # WMS implementation
    ├── example.js                   # Usage examples
    └── style.less                   # WMS-specific styling
```

## Features

### Common Features (All Implementations)
- ✅ Time dimension navigation (play/pause/step)
- ✅ Date picker with validation
- ✅ Configurable time increments
- ✅ Layer transitions and animations
- ✅ Legend display
- ✅ Elevation support (when available)
- ✅ Style selection
- ✅ Responsive UI controls

### CMEMS/WMTS Specific
- ✅ WMTS tile service support
- ✅ Marine Copernicus capabilities parsing
- ✅ Product/dataset/variable structure
- ✅ High DPI support (@2x tiles)

### WMS Specific
- ✅ Standard WMS GetMap requests
- ✅ WMS GetCapabilities parsing
- ✅ ISO8601 time dimension support
- ✅ Multiple time format handling
- ✅ Layer-based configuration

## Usage

### CMEMS/WMTS Usage

```javascript
const { TimeMapLegend } = await moduleLoad("extension", 'cmems_time_map_legend');

const config = {
  idView: widget.opt.view.id,
  map: widget.opt.map,
  baseURL: "https://wmts.marine.copernicus.eu/teroWmts",
  product: "GLOBAL_ANALYSISFORECAST_PHY_001_024",
  dataset: "cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m_202406",
  variable: "thetao",
  elLegend: elLegend,
  elInputs: widget.elContent,
};

const tml = new TimeMapLegend(config);
await tml.init();
```

### WMS Usage

```javascript
const { WMSTimeMapLegend } = await moduleLoad("extension", 'wms_time_map_legend');

const config = {
  idView: widget.opt.view.id,
  map: widget.opt.map,
  baseURL: "https://your-wms-server.com/geoserver/ows",
  layerName: "workspace:layer_name",
  elLegend: elLegend,
  elInputs: widget.elContent,
};

const tml = new WMSTimeMapLegend(config);
await tml.init();
```

## Configuration Options

### Common Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `idView` | string | null | MapX view identifier |
| `map` | object | null | Mapbox GL JS map instance |
| `baseURL` | string | null | Service base URL |
| `elInputs` | HTMLElement | null | Container for UI controls |
| `elLegend` | HTMLElement | null | Container for legend |
| `animation` | boolean | true | Enable layer transitions |
| `transitionDuration` | number | 2000 | Transition duration (ms) |
| `showLayers` | boolean | true | Show layer selector |
| `showStyles` | boolean | true | Show style selector |
| `showIncrement` | boolean | true | Show increment selector |
| `increment` | string | "P1D" | Default time increment |

### CMEMS-Specific Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `product` | string | null | CMEMS product identifier |
| `dataset` | string | null | CMEMS dataset identifier |
| `variable` | string | null | Variable name |
| `elevation` | number | 0 | Default elevation |

### WMS-Specific Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `layerName` | string | null | WMS layer name |
| `style` | string | null | Default style name |

## Time Dimension Support

### WMS Time Formats

The WMS implementation supports various time dimension formats:

1. **Single dates**: `2007-02-02T00:00:00.000Z,2007-02-18T00:00:00.000Z`
2. **Intervals**: `2007-02-02T00:00:00.000Z/2025-02-02T00:00:00.000Z/P2W2D`
3. **Mixed formats**: Combination of single dates and intervals

### Example Time Dimension

```xml
<Dimension name="time" default="2025-02-02T00:00:00.000Z" units="ISO8601" nearestValue="1">
  2007-02-02T00:00:00.000Z/2025-02-02T00:00:00.000Z/P2W2D
</Dimension>
```

## Extending the Architecture

To add support for a new service type:

1. Create a new directory (e.g., `wfs/`)
2. Extend `BaseTimeMapLegend`
3. Implement abstract methods:
   - `constructUrl()`
   - `constructGetCapabilitiesUrl()`
   - `createLayerInfo()`
   - `getLegendUrl()`
4. Add service-specific parsing logic
5. Export in `index.js`

### Example Extension

```javascript
import { BaseTimeMapLegend } from "../shared/base_time_map_legend.js";

export class CustomTimeMapLegend extends BaseTimeMapLegend {
  constructUrl(selectedDate, selectedElevation, selectedStyle) {
    // Implement custom URL construction
  }

  constructGetCapabilitiesUrl() {
    // Implement capabilities URL construction
  }

  createLayerInfo(xmlDoc) {
    // Implement service-specific parsing
  }

  getLegendUrl() {
    // Implement legend URL logic
  }
}
```

## Error Handling

The extensions include comprehensive error handling:

- **Invalid capabilities**: Graceful degradation with error messages
- **Missing layers**: Clear error with available layer list
- **Network failures**: Automatic cleanup and user notification
- **Invalid time values**: Fallback to default values

## Performance Considerations

- **Layer caching**: Old layers are cleaned up after transitions
- **Debounced updates**: UI changes are debounced to prevent excessive requests
- **Memory management**: Proper cleanup on widget destruction
- **High DPI support**: Automatic tile size adjustment

## Browser Compatibility

- Modern browsers with ES6+ support
- Mapbox GL JS compatibility
- Luxon for date/time handling
- Flatpickr for date picker UI

## Migration from Legacy Implementation

If you have existing CMEMS implementations:

1. Update import statements to use the new module structure
2. Configuration remains largely the same
3. All existing functionality is preserved
4. New features are automatically available

## Troubleshooting

### Common Issues

1. **"Layer not found" error**: Check layer name spelling and availability
2. **No time dimension**: Verify the service supports temporal queries
3. **Capabilities parsing errors**: Check service URL and CORS settings
4. **UI not displaying**: Ensure `elInputs` and `elLegend` containers are provided

### Debug Mode

Enable debug logging:

```javascript
window._tm = tml; // Access instance for debugging
console.log(tml.getLayerInfoAll()); // Inspect parsed capabilities
