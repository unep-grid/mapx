# ARCO Integration in MapX — Plan

## Context

Copernicus Marine Service is migrating from traditional OGC services (WMTS/WMS/OPeNDAP) to **ARCO** (Analysis Ready Cloud Optimized) as their primary data delivery format. Legacy services have been progressively shut down (MOTU, OPeNDAP, ERDDAP, FTP, WMS — all removed as of April 2024). The WMTS endpoint used by the current CMEMS extension (`wmts.marine.copernicus.eu/teroWmts`) still works but is likely on borrowed time.

A new extension using ARCO data would future-proof MapX's ocean data visualization and give users more control over styling (client-side colormapping instead of pre-rendered tiles).

---

## What is ARCO?

**ARCO = Analysis Ready Cloud Optimized**

- **Format**: OGC Zarr — a chunked, compressed, cloud-native array format. Each chunk is a separate HTTP-addressable object; metadata is a single JSON file (`.zmetadata`).
- **"Analysis Ready"**: Data homogenized by Copernicus — consistent null values, normalized coordinates, monotonic dimensions, longitude in [-180, 180).
- **"Cloud Optimized"**: Chunks function like tiles — only needed spatial/temporal slices are fetched. Two chunking strategies offered:
  - **Geo Series**: large spatial chunks, small time chunks → "show me the whole ocean today"
  - **Time Series**: small spatial chunks, large time chunks → "show me 10 years at one point"
- **Access**: HTTP range requests or S3 protocol. No special server needed — just `fetch()`.

**Key shift from WMTS**: instead of requesting pre-rendered, pre-styled map tiles, the client fetches raw numerical data chunks and renders them locally with a colormap. This is what MyOcean Pro does in production.

---

## Independent Tool or Extension?

**Recommendation: Extension, same pattern as CMEMS.**

Reasons:

1. **The `BaseTimeMapLegend` base class** (`app/src/js/extensions/shared/base_time_map_legend.js`) already provides 80% of what's needed: time slot management, animation loop (play/pause/step), date picker (Flatpickr), increment selector, elevation selector, layer ordering, and the widget lifecycle (`init()` / `destroy()`).

2. **The CMEMS extension** (`app/src/js/extensions/cmems/ocean_map_legend.js`) and the **WMS extension** (`app/src/js/extensions/wms/wms_time_map_legend.js`) both follow the same subclass pattern. ARCO would be a third implementation of the same interface.

3. **The extension loading system** (`moduleLoad("extension", 'arco_time_map_legend')`) and widget handler pattern (`onAdd` / `onRemove`) already work. No new infrastructure needed.

4. **What changes**: the layer source type. CMEMS/WMS use MapboxGL `raster` sources with tile URLs (`{z}/{x}/{y}`). ARCO would use a `canvas` source or `CustomLayerInterface` fed by client-side rendering. The `constructUrl()` and `createLayerInfo()` overrides handle this difference.

5. **Possible refactoring**: `BaseTimeMapLegend.update()` currently assumes a tile URL and calls `map.addLayer()` with `type: "raster"`. The ARCO subclass would need to override `update()` more heavily — or the base class could be lightly refactored to make the layer creation step hookable. This is a minor change.

**Export in `app/src/js/extensions/index.js`:**
```javascript
export * as arco_time_map_legend from "./arco/arco_time_map_legend.js";
```

---

## Architecture

### Client-Side (Extension)

```
app/src/js/extensions/arco/
├── arco_time_map_legend.js   # Extends BaseTimeMapLegend
├── zarr_reader.js            # Zarr chunk fetching + caching
├── raster_renderer.js        # Float32Array → Canvas pixels (colormap)
├── colormaps.js              # Color scales (viridis, thermal, etc.)
├── example.js                # Widget handler (same pattern as CMEMS)
└── style.less
```

**Rendering pipeline:**
```
Zarr Store (HTTP/S3)
  → zarr.js HTTPStore → fetch only chunks covering current viewport + time step
  → Float32Array (raw ocean values: SST in °C, chlorophyll in mg/m³, etc.)
  → Colormap lookup (value → RGBA)
  → Canvas ImageData or WebGL texture
  → MapboxGL CanvasSource / CustomLayerInterface
```

### Server-Side (API — Optional Proxy)

The MapX API (`api/index.js`, Express.js on port 3030) already has a **mirror/proxy module** (`api/modules/mirror/`) with rate limiting and header forwarding. This could be extended or a dedicated endpoint added.

**What the server could handle:**

| Concern | Server-side role |
|---------|-----------------|
| **CORS bypass** | If Copernicus S3 buckets lack proper CORS headers, a proxy endpoint (`/get/arco/chunk`) would forward chunk requests. Uses the existing mirror pattern. |
| **Authentication** | Copernicus Marine requires a free account. If ARCO endpoints need auth tokens, the server stores credentials and signs requests (keeps secrets out of the browser). |
| **Chunk transcoding** | Optionally decompress/reproject chunks server-side before sending to client. Reduces browser CPU load. Could use Python subprocess via the existing `asyncSpawn` pattern (used in `api/modules/upload/`). |
| **Metadata caching** | Cache `.zmetadata` responses in Redis (already available in the stack) to avoid repeated round-trips to Copernicus. |
| **Pre-rendered tile fallback** | For low-end clients, the server could read Zarr chunks and return PNG tiles (essentially recreating WMTS locally). This would make the extension work identically to the current CMEMS one — no client-side rendering needed. |
| **Dataset catalog** | Serve a curated list of available ARCO datasets (product IDs, variables, time ranges) so the client doesn't need to discover them at runtime. Could be a simple JSON endpoint or stored in PostgreSQL. |

**Minimal viable server addition**: a single proxy route in `api/modules/mirror/` or a new `api/modules/arco/` that forwards `fetch` requests to `s3://mdl-native-*` with proper auth headers. Everything else can start client-side.

---

## Further Investigation

Before implementation, the following should be validated:

### 1. Browser access to ARCO endpoints
- **Test**: Can `zarr.js` `HTTPStore` open a Copernicus ARCO dataset from a browser?
- **What to check**: CORS headers on `s3://mdl-native-01/native/...` endpoints, whether authentication is required, what the actual HTTP URL pattern is (the S3 path needs an HTTP gateway).
- **How**: A minimal HTML page with `zarr.js` fetching `.zmetadata` from a known dataset.
- **Fallback**: If CORS or auth blocks direct access → server-side proxy is required (see above).

### 2. Zarr.js capabilities and limitations
- **Zarr v2 vs v3**: Copernicus uses Zarr v2. Confirm `zarr.js` supports v2 (it does, but `zarrita.js` targets v3).
- **Chunk size**: What is the typical chunk size for Geo Series data? If chunks are 10+ MB, client-side rendering may lag on slow connections.
- **Compression**: Zarr chunks are typically compressed (zlib, blosc). Verify `zarr.js` handles decompression in-browser.

### 3. BaseTimeMapLegend coupling
- **Read `base_time_map_legend.js` carefully**: identify all places that assume `type: "raster"` tile sources.
- **Decide**: override `update()` entirely in the ARCO subclass, or refactor the base class to make layer creation hookable (e.g., a `createLayer()` method that subclasses override).
- **Risk**: refactoring the base class could break CMEMS and WMS extensions. Thorough testing needed.

### 4. Rendering performance
- **Canvas vs WebGL**: Canvas (`ImageData`) is simpler but slower for large arrays. WebGL (`regl`) is fast but more complex. Start with Canvas, upgrade to WebGL if needed.
- **Reprojection**: ARCO data is on regular lat/lon grids. MapboxGL uses Web Mercator (EPSG:3857). At low zoom levels the distortion is significant. Options: reproject in JS (expensive), use `CanvasSource` with corner coordinates (MapboxGL handles the warp), or reproject server-side.

### 5. Client-side legend generation
- WMTS returns a legend image via `GetLegendGraphic`. ARCO has no equivalent.
- The extension must render its own legend from the colormap definition (a simple gradient bar with labels). This is new functionality not in `BaseTimeMapLegend`.

### 6. MyOcean Pro as reference
- Inspect MyOcean Pro's network traffic (browser DevTools) to understand:
  - What URLs it fetches for ARCO data
  - Request/response headers (auth? CORS?)
  - Chunk sizes and compression
  - How it handles time dimension switching

---

## Challenges

| Challenge | Severity | Notes |
|-----------|----------|-------|
| **CORS / Authentication** | High | If Copernicus endpoints don't allow browser access, a server proxy is mandatory. This adds latency and server load. |
| **Data volume** | Medium | Ocean datasets are large. Even with chunking, a global view at high resolution could mean dozens of MB per time step. Need aggressive viewport-based subsetting and zoom-level-aware chunk selection. |
| **Client-side rendering** | Medium | Going from raw values to pixels is non-trivial: colormap application, handling NaN/land masks, reprojection. WebGL helps but adds complexity. |
| **Colormap management** | Low–Medium | WMTS handles styling server-side. With ARCO, MapX must provide and manage colormaps. This is also an opportunity (user-adjustable scales, log/linear toggle, custom palettes). |
| **Reprojection** | Medium | Lat/lon → Web Mercator in the browser. `CanvasSource` with geographic bounds handles this at the cost of some distortion. Alternatively, pre-reproject on the server. |
| **Legend generation** | Low | Must build a gradient legend client-side instead of fetching a legend image. Straightforward but new code. |
| **Base class refactoring** | Low | `BaseTimeMapLegend` may need a minor refactor to support non-tile sources without breaking CMEMS/WMS. |
| **Zarr library maturity** | Low | `zarr.js` is stable for v2 but not heavily maintained. `zarrita.js` is newer but targets v3. Need to pick the right library and potentially handle edge cases. |
| **Offline / slow networks** | Low | Chunk-based fetching is inherently progressive, but no pre-rendered tile cache exists. Consider a service worker or IndexedDB cache for visited time steps. |

---

## Bibliography

### Copernicus Marine / ARCO Documentation

- [Introduction to the ARCO format](https://help.marine.copernicus.eu/en/articles/12332770-introduction-to-the-arco-format) — Official ARCO overview from Copernicus Marine Help Center
- [Differences between NetCDF and ARCO formats](https://help.marine.copernicus.eu/en/articles/8656000-differences-between-netcdf-and-arco-formats) — Format comparison
- [Copernicus Marine Toolbox — Services](https://help.marine.copernicus.eu/en/articles/7969584-copernicus-marine-toolbox-services) — API access methods (S3, subset, open)
- [Copernicus Marine Toolbox API — Subset](https://help.marine.copernicus.eu/en/articles/8283072-copernicus-marine-toolbox-api-subset) — Subsetting parameters and usage
- [Switching from old to new services](https://help.marine.copernicus.eu/en/articles/8612591-switching-from-old-to-new-services) — Migration guide from legacy endpoints
- [Introduction to MyOcean Pro Viewer](https://help.marine.copernicus.eu/en/articles/6482737-introduction-to-myocean-pro-viewer) — MyOcean Pro architecture overview
- [How to open and visualize Zarr format data](https://help.marine.copernicus.eu/en/articles/8077952-how-to-open-and-visualize-zarr-format-data) — Zarr usage guide
- [Marine Data Store](https://data.marine.copernicus.eu/) — Dataset catalog and access portal
- [Copernicus Marine Toolbox documentation](https://toolbox-docs.marine.copernicus.eu/) — Full toolbox docs
- [Our data stores turn ARCO](https://climate.copernicus.eu/work-progress-our-data-stores-turn-arco) — Copernicus Climate Service ARCO roadmap

### Zarr Specification & Libraries

- [Zarr specification (v2)](https://zarr.readthedocs.io/en/stable/spec/v2.html) — Official format specification
- [zarr.js — GitHub](https://github.com/gzuidhof/zarr.js/) — JavaScript/TypeScript Zarr v2 implementation
- [zarrita.js — GitHub](https://github.com/manzt/zarrita.js) — Modern Zarr v3 JavaScript implementation
- [Zarr in the Browser — Medium](https://medium.com/@tobias.ramalho.ferreira/zarr-in-the-browser-fast-flexible-and-surprisingly-powerful-for-big-geo-data-eeb90ddf8a3d) — Practical guide to browser-side Zarr

### Client-Side Rendering & MapboxGL

- [CarbonPlan maps — GitHub](https://github.com/carbonplan/maps) — Production Zarr → WebGL → MapboxGL library
- [CarbonPlan zarr-webgl-mapbox — GitHub](https://github.com/carbonplan/zarr-webgl-mapbox/) — Prototype/playground for Zarr array rendering on MapboxGL
- [regl — GitHub](https://github.com/regl-project/regl) — Functional WebGL abstraction
- [MapboxGL CanvasSource](https://docs.mapbox.com/mapbox-gl-js/api/sources/#canvassource) — Canvas as a map source
- [MapboxGL CustomLayerInterface](https://docs.mapbox.com/mapbox-gl-js/api/properties/#customlayerinterface) — Raw WebGL layer integration
- [Dynamic Client Zarr Visualization — NASA IMPACT](https://nasa-impact.github.io/zarr-visualization-report/approaches/dynamic-client.html) — NASA's evaluation of client-side Zarr rendering

### Scientific Context

- [Pangeo Forge: Crowdsourcing ARCO Data Production — Frontiers in Climate](https://www.frontiersin.org/journals/climate/articles/10.3389/fclim.2021.782909/full) — Academic paper on ARCO data pipelines
- [ARCO ERA5 — Google Research GitHub](https://github.com/google-research/arco-era5) — Google's ARCO implementation for ERA5 climate reanalysis
- [ARCO: The Smartest Way to Access Big Geospatial Data — Lobelia Earth](https://blog.lobelia.earth/arco-the-smartest-way-to-access-big-geospatial-data-eaf689eff3c9) — Industry perspective on ARCO adoption
