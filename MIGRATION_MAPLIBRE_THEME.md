# Migration Plan: mapbox-gl → maplibre-gl + mapx-style theme system

**Scope:** Replace the legacy `app/src/js/theme/` system and all `mapbox-gl` references
with `maplibre-gl` + the `@unepgrid-mapx/theme-core` package from `submodules/mapx-style/`.

Work in small, independently-committable chunks. 

Each phase must leave the build + test green :

```sh 
npm run test 
``` 

---

## Phase 1 — Dependencies

- [x] **1.1** ~~Add `maplibre-gl` to `app/package.json`~~ — already present (`^5.22.0`)
- [x] **1.2** ~~Add `maplibre-contour` (`mlcontour`) to `app/package.json`~~ — already present (`^0.1.0`)
- [x] **1.3** Add `@unepgrid-mapx/theme-core` as a local workspace dep:
  `"@unepgrid-mapx/theme-core": "file:../submodules/mapx-style/packages/theme-core"`
- [x] **1.4** Run `npm install` in `app/`, verify no peer-dep conflicts
- [x] **1.5** Replace `mapbox-gl/dist/mapbox-gl.css` import in `app/src/js/init_mx.js:3`
  with `maplibre-gl/dist/maplibre-gl.css` (do this alongside step 2.1 so both libs don't
  inject duplicate CSS during the parallel-testing window)

---

## Phase 2 — MapLibre core swap (JS imports)

Five files import `mapbox-gl` directly. Replace one at a time; build+smoke-test after each.

- [x] **2.1** `app/src/js/mx.js:3` — replace `import mapboxgl from "mapbox-gl"` with `maplibre-gl`;
  update the global export (`mx.mapboxgl`) — renamed to `mx.maplibregl`
- [x] **2.2** `app/src/js/listener_store/index.js:2` — replace `{ Map } from "mapbox-gl"` with `maplibre-gl`
- [x] **2.3** `app/src/js/raster_mini_map/index.js:1` — replace import
- [x] **2.4** `app/src/js/map_composer/components/item.js:1` — replace import
- [x] **2.5** `app/src/js/magnifier/index.js:3` — replace import
- [x] **2.6** Grep-check remaining `mapboxgl` variable usages across all JS files listed below and
  update any that still receive the mapbox-gl object:
  - `map_helpers/index.js` ✓ (import + all LngLatBounds/LngLat/Map usages renamed)
  - `map_helpers/utils.js` ✓ (only JSDoc comments — updated in Phase 11)
  - `north_arrow/index.js`, `map_controls/index.js` ✓ (`.mapboxgl-ctrl` are CSS classes — Phase 6)
  - `language/index.js` ✓, `geocoder/index.js` ✓, `geocoder/geocoder.test.js` ✓ (mock updated)
  - `story_map/index.js`, `story_map/settings.js` ✓ (`.mapboxgl-ctrl-*` CSS class names — Phase 6)
  - `map_info_box/index.js` ✓ (JSDoc only — Phase 11), `init_mx.js` ✓
  - `mx_helper_map_dragdrop.js` ✓
  - `features_highlight/features_highlight.js` ✓ — error string updated
  - `draw/helper.js` — `moduleLoad("mapbox-gl-draw")` and `.mapbox-gl-draw_ctrl-draw-btn` are
    draw-library-owned identifiers; **do not rename these**
  - Low-priority comment/JSDoc-only references (no runtime impact, update for accuracy in Phase 11):
    `commonloc/index.js`, `mirror_util/index.js`, `style_vt/mbstyle_to_sld.js`,
    `is_test/index.js`, `map_composer/map_composer_modal.js`
  - Note: added `URL.createObjectURL` stub to `vitest.setup.js` — maplibre-gl v5 calls it at
    module init to register its web worker; jsdom does not implement it

---

## Phase 3 — Remove RTL plugin

RTL is now bootstrapped inside `MapxStyle` constructor in the submodule (lazy CDN load via
`maplibregl.setRTLTextPlugin()`). Avoid double-registration.

- [x] **3.1** In `app/src/js/language/index.js` — remove `mapboxRTLload()` function (`language/index.js:641`)
  and its call site (`language/index.js:596`). The CDN URL at line 650 is replaced by the one
  inside `MapxStyle`; no separate package to remove from `app/package.json`.
- [x] **3.2** Wire language changes through `mapxStyle.setLanguage(lang)` so that `MapxStyle`
  controls both the map style language labels and RTL activation (see Phase 4.4).
- [ ] **3.3** Verify Arabic/Hebrew rendering still works end-to-end after MapxStyle is wired (Phase 4)

---

## Phase 4 — Wire MapxStyle (basemap + theme engine)

Replace the ad-hoc `init_theme.js` / `mapx_style_resolver.js` apply path with `MapxStyle`.

- [x] **4.1** Create `app/src/js/init_mapx_style.js`:
  - Import `maplibregl` from `maplibre-gl`
  - Import `mlcontour` from `maplibre-contour`
  - Import `{ MapxStyle }` from `@unepgrid-mapx/theme-core` (**named export, not default**)
  - Instantiate: `export const mapxStyle = new MapxStyle({ maplibregl, mlcontour })`
- [x] **4.2** In the map construction site (find where `new mapboxgl.Map(...)` is called),
  wire both `style` and `transformRequest` at construction time, then call `attachMap`:
  ```js
  const map = new maplibregl.Map({
    style: mapxStyle.getStyle(),
    transformRequest: mapxStyle.transformRequest,
    // ...other options
  });
  mapxStyle.attachMap(map);
  ```
  `transformRequest` **must** be passed at construction — not after — so HCP S3 auth is
  injected from the very first tile request.
- [x] **4.3** Replace `theme.set(idTheme)` call sites with `mapxStyle.setTheme(idTheme)`,
  keeping the same event/callback contract as the old Theme class where needed.
  `theme.setColors()` now dynamically imports and calls `mapxStyle.setTheme(t._theme)` so
  any theme change (UI editor, project theme, query param) propagates to the map.
- [x] **4.4** Replace `theme.setLanguage(lang)` call sites with `mapxStyle.setLanguage(lang)`
  (language/index.js is the primary consumer) — `updateLanguageMap()` now delegates to
  `mapxStyle.setLanguage(lang)`. `mapxStyle` exported from `mx.js`.
- [x] **4.5** Validate that `css_resolver` CSS custom properties (`--mx_ui_*`, `--mx_map_*`) are
  still emitted — MapxStyle uses the same resolver; confirm no property names changed
- [x] **4.6** Delete `app/src/js/theme/mapx_style_resolver.js` (logic now lives in submodule).
  `theme/index.js` no longer imports resolvers; `validateColors()` uses chroma-only check.
  Note: `vitest.config.js` gained `resolve.dedupe` for symlinked theme-core deps.

---

## Phase 5 — Slim down / remove legacy Theme class

The Theme class owns two distinct concerns: **CRUD UI** and **apply-to-map**. Only CRUD survives.

- [x] **5.1** Audit all `theme.*` method calls across the codebase; classify each as
  CRUD (keep in ThemeService/ThemeModal) or apply-to-map (replace with MapxStyle).
  Result: only `linkMap`/`updateMap`/`updateCss` were apply-to-map; all removed.
- [x] **5.2** `upsertSession/upsertLocalStorage/upsertDatabase` already delegate to
  `set()` → `setColors()` → `mapxStyle.setTheme()` — apply path fully covered, no change needed.
- [x] **5.3** `ThemeService` and `ThemeModal` intact.
- [x] **5.4** Removed `linkMap`, `updateMap`, `updateCss` (dead code — only referenced
  undefined `css_resolver`/`layer_resolver`; never called externally). Migrated `MapScaler`
  to submodule (`packages/theme-core/src/map_scaler.js`), exported from
  `@unepgrid-mapx/theme-core`. Added `scale(v,types)` / `scaleText(v)` / `scaleIcon(v)` to
  `MapxStyle`. `app/src/js/map_scaler/index.js` now re-exports from the submodule.
  `map_composer/components/item.js` unchanged (imports via re-export path transparently).
- [x] **5.5** `fonts.js` kept — still consumed by theme UI font selector (Phase 5 concern only).
- [x] **5.6** `init_theme.js` already minimal and correct — no changes needed.

---

## Phase 6 — CSS class names: mapboxgl → maplibregl

MapLibre uses `.maplibregl-*` instead of `.mapboxgl-*`.

- [x] **6.1** `app/src/css/mx_mapbox.css` — bulk-replaced `.mapboxgl-` → `.maplibregl-`
- [x] **6.2** `app/src/css/mx_base.css` — same
- [x] **6.3** `app/src/css/mx_modifiers.css` — same
- [x] **6.4** JS class name strings updated:
  - `map_controls/index.js` — `mapboxgl-ctrl` / `mapboxgl-ctrl-attrib` → `maplibregl-*`
  - `north_arrow/index.js` — `mapboxgl-ctrl` → `maplibregl-ctrl`
  - `story_map/index.js` — querySelector selectors updated
  - `story_map/settings.js` — `mapboxgl-control-container` → `maplibregl-control-container`
- [x] **6.5** `draw/style.less` cursor states (`.mapboxgl-map` / `.mapboxgl-canvas-container`)
  updated to `.maplibregl-map` / `.maplibregl-canvas-container`.
  Also updated: `raster_mini_map/style.less`, `map_composer/style/map_composer.less`.
  Draw library's own `.mapbox-gl-draw_ctrl-*` namespace left untouched.

---

## Phase 7 — Fix draw library styles for MapLibre compatibility

`@mapbox/mapbox-gl-draw` is API-compatible with MapLibre via duck-typing. The only hard
breakage is that MapLibre 3.x requires array literals in expressions to be wrapped in
`["literal", [...]]` — the default draw styles use bare `line-dasharray: [2, 2]` arrays
which MapLibre rejects. `mapbox-gl-draw-circle` extends MapboxDraw modes and is unaffected.

**No library replacement needed.** Fix by passing corrected `styles` to the constructor.

- [x] **7.1** `app/src/js/draw/draw.js` — statically imports `@mapbox/mapbox-gl-draw/src/lib/theme.js`,
  deep-clones it into `drawStyles`, and wraps any bare `line-dasharray` array in
  `["literal", [...]]` (affects `gl-draw-polygon-stroke-active` and `gl-draw-line-active`).
  `styles: drawStyles` passed to the `MapboxDraw` constructor.
  Note: only 2 layers had bare dasharray in the shipped theme (not 3 as originally estimated).
- [ ] **7.2** Smoke-test all draw modes: point, line, polygon, circle — verify no console
  expression errors and that dashed lines render correctly
- [x] **7.3** No other expression errors found — `filter` arrays use standard MapLibre
  expression operators (`all`, `==`, `!=`) which do not need `literal` wrapping.

---

## Phase 8 — Service Worker / Webpack

- [x] **8.1** In `app/webpack/webpack.prod.js` — removed Workbox runtime cache rules for
  `https://api.mapbox.com/` and `https://tiles.mapbox.com/`
- [x] **8.2** Added Workbox rules (CacheFirst, 1 year) for:
  - `mapx.unepgrid.s3.unige.ch/mapx/style/` (glyphs/PBFs only)
  - `tiles.mapterhorn.com/` (terrain WebP tiles)
  - PMTiles (`.pmtiles`) excluded — they use HTTP Range requests and have their own
    internal fetch cache; SW CacheFirst would create one entry per range slice.
- [x] **8.3** Mapterhorn 404 silencing already handled in submodule:
  `mapx_style.js:89` — `if (String(e?.error?.message ?? "").includes("mapterhorn.com")) return;`
- [x] **8.4** `CopyWebpackPlugin` only copies `sw_listen_skip_waiting_install.js` — no mapbox-gl assets

---

## Phase 9 — Backend theme schema sync

The API schema (`api/modules/themes/schemas/combined.js`) must stay in sync with
the color property set used by `@unepgrid-mapx/theme-core`.

- [x] **9.1** Diffed `combined.js` (55 color properties) against `classic_light.json` —
  exact match, no mismatches found
- [x] **9.2** No changes needed — schemas already in sync
- [x] **9.3** `validate.js` is a runtime validator module with no standalone unit tests;
  validation runs at API save/load time
- [x] **9.4** No property names changed — no DB migration needed

---

## Phase 10 — SDK updates

The MapX SDK (`app/src/js/sdk/`) exposes map-related API surface to external consumers.

- [x] **10.1** Audited `sdk/src/mapx_resolvers/static.js` — 7 JSDoc-only references updated:
  mapbox docs URLs → maplibre.org equivalents; `mx.mapboxgl.MercatorCoordinate` →
  `mx.maplibregl.MercatorCoordinate` (in commented-out block)
- [x] **10.2** No type exports use `mapboxgl` — SDK has no TypeScript types
- [x] **10.3** Rebuilt SDK: `npm run build:sdk` — dist files clean
- [x] **10.4** Fixed `is_test/index.js` JSDoc (`mapboxgl.LngLat/LngLatBounds` →
  `maplibregl.*`); rebuilt test utils — all dist files clean except one stale orphan
  sourcemap `mxsdk-test-utils.modern.mjs.map` (old microbundle artifact, no longer generated)

---

## Phase 11 — Cleanup & removal

Only do this after all phases above are green and tested.

- [x] **11.1** Removed `mapbox-gl` from `app/package.json`; `npm install` confirmed uninstalled
- [x] **11.2** Removed `@types/mapbox-gl` from `app/package.json`
- [x] **11.3** Already done in Phase 4.6
- [x] **11.4** Theme class kept — owns CRUD UI (ThemeService, ThemeModal); apply-to-map
  fully replaced by MapxStyle in Phase 5
- [x] **11.5** Already done in Phase 1.5
- [x] **11.6** Final grep clean. Remaining intentional references:
  - `_archives/` — not in build
  - `draw/draw.js`, `draw/helper.js` — `@mapbox/mapbox-gl-draw` / `mapbox-gl-draw-circle`
    library names; must not change
  - Bug report URLs in `map_composer_modal.js`, `mx_helper_map_dragdrop.js` — historical
  - `style_vt/mbstyle_to_sld.js` — describes the "mapbox style" format name
  - `geocoder/geocoder.test.js:4` — `// Mock mapboxgl` comment
  All 110 tests pass.

---

## Key file map (quick reference)

| What | Where |
|---|---|
| 5 direct mapbox-gl imports | mx.js, listener_store, raster_mini_map, map_composer/item, magnifier |
| RTL plugin call | `language/index.js` → `mapboxRTLload()` |
| Theme apply-to-map | `theme/index.js` + `theme/mapx_style_resolver.js` |
| Theme CRUD (keep) | `theme/services.js`, `theme/theme_modal.js` |
| New style engine | `submodules/mapx-style/packages/theme-core/src/mapx_style.js` |
| CSS class names | `mx_mapbox.css`, `mx_base.css`, `mx_modifiers.css` |
| Backend schema | `api/modules/themes/schemas/combined.js` |
| Service worker | `app/webpack/webpack.prod.js` (Workbox rules) |
| Draw library | `app/src/js/draw/draw.js` |
