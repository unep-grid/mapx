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

- [ ] **5.1** Audit all `theme.*` method calls across the codebase; classify each as
  CRUD (keep in ThemeService/ThemeModal) or apply-to-map (replace with MapxStyle)
- [ ] **5.2** Remove `theme.upsertSession()` / `upsertLocalStorage()` / `upsertDatabase()`
  flow from the apply path — MapxStyle owns the active state now
- [ ] **5.3** Keep `ThemeService` (websocket CRUD) and `ThemeModal` (UI) intact —
  they talk to the API, not to the map
- [ ] **5.4** Reduce `Theme` class to a thin coordinator:
  fetch theme from storage/API → hand colors to `mapxStyle.setTheme()`
- [ ] **5.5** Remove `app/src/js/theme/fonts.js` if MapxStyle fully covers font loading;
  otherwise keep and wire it to `mapxStyle` lifecycle events
- [ ] **5.6** Update `init_theme.js` to use the new slim Theme + mapxStyle,
  or replace it entirely with `init_mapx_style.js` (see 4.1)

---

## Phase 6 — CSS class names: mapboxgl → maplibregl

MapLibre uses `.maplibregl-*` instead of `.mapboxgl-*`.

- [ ] **6.1** `app/src/css/mx_mapbox.css` — bulk-replace `.mapboxgl-` selectors with `.maplibregl-`
  (verify each rule still applies to the correct DOM element after swap)
- [ ] **6.2** `app/src/css/mx_base.css` — same
- [ ] **6.3** `app/src/css/mx_modifiers.css` — same
- [ ] **6.4** Grep JS files for `querySelector('.mapboxgl-` / `getElementsByClassName` usages
  and update them (`map_controls/index.js`, `map_info_box/index.js` are candidates)
- [ ] **6.5** Check `@mapbox/mapbox-gl-draw` CSS for selectors scoped under `.mapboxgl-map`
  (cursor states etc.) — update to `.maplibregl-map` if present.
  **Note:** The draw library's own class namespace (`.mapbox-gl-draw_ctrl-*`) is library-owned
  and must **not** be renamed — only `.mapboxgl-*` runtime-generated classes need changing.

---

## Phase 7 — Fix draw library styles for MapLibre compatibility

`@mapbox/mapbox-gl-draw` is API-compatible with MapLibre via duck-typing. The only hard
breakage is that MapLibre 3.x requires array literals in expressions to be wrapped in
`["literal", [...]]` — the default draw styles use bare `line-dasharray: [2, 2]` arrays
which MapLibre rejects. `mapbox-gl-draw-circle` extends MapboxDraw modes and is unaffected.

**No library replacement needed.** Fix by passing corrected `styles` to the constructor.

- [ ] **7.1** In `app/src/js/draw/draw.js`, add a `styles` array to the `MapboxDraw`
  constructor call. Start from the official default styles and wrap every `line-dasharray`
  value in `["literal", [...]]`. Affected layers in the defaults:
  - `gl-draw-line-inactive` — `'line-dasharray': ["literal", [0.2, 2]]`
  - `gl-draw-line-active` — `'line-dasharray': ["literal", [0.2, 2]]`
  - `gl-draw-polygon-stroke-static` — `'line-dasharray': ["literal", [0.2, 2]]`
- [ ] **7.2** Smoke-test all draw modes: point, line, polygon, circle — verify no console
  expression errors and that dashed lines render correctly
- [ ] **7.3** If any other expression errors surface (e.g. `filter` arrays), apply the same
  `["literal", [...]]` fix to those properties

---

## Phase 8 — Service Worker / Webpack

- [ ] **8.1** In `app/webpack/webpack.prod.js` — remove Workbox runtime cache rules for
  `https://api.mapbox.com/` and `https://tiles.mapbox.com/`
- [ ] **8.2** Add Workbox rules for MapLibre CDN or PMTiles S3 endpoints if offline caching
  is still required
- [ ] **8.3** Check `CopyWebpackPlugin` entries — nothing should be copying mapbox-gl assets

---

## Phase 9 — Backend theme schema sync

The API schema (`api/modules/themes/schemas/combined.js`) must stay in sync with
the color property set used by `@unepgrid-mapx/theme-core`.

- [ ] **9.1** Diff the 90+ color properties in `combined.js` against the theme schema
  inside `submodules/mapx-style/packages/theme-core/src/themes/`
- [ ] **9.2** Add/remove/rename any mismatched properties in `combined.js`
- [ ] **9.3** Run `api/modules/themes/validate.js` unit tests against the updated schema
- [ ] **9.4** Migrate existing stored themes in DB if property names changed (write a migration script)

---

## Phase 10 — SDK updates

The MapX SDK (`app/src/js/sdk/`) exposes map-related API surface to external consumers.

- [ ] **10.1** Audit `sdk/src/mapx_resolvers/static.js` for `mapboxgl` references
- [ ] **10.2** Update SDK exports/types to reflect maplibre-gl
- [ ] **10.3** Rebuild SDK: `npm run build:sdk`
- [ ] **10.4** Update SDK test utils in `sdk/tests/utils/` (built dist files reference mapboxgl)

---

## Phase 11 — Cleanup & removal

Only do this after all phases above are green and tested.

- [ ] **11.1** Remove `mapbox-gl` from `app/package.json` dependencies
- [ ] **11.2** Remove `@types/mapbox-gl` from `app/package.json`
- [ ] **11.3** Remove `app/src/js/theme/mapx_style_resolver.js` if not already done (Phase 4.6)
- [ ] **11.4** Remove or archive `app/src/js/theme/` if Theme class is fully replaced
- [ ] **11.5** Remove mapbox-gl CSS import site
- [ ] **11.6** Confirm no `mapbox-gl` or `mapboxgl` string remains in tracked source files:
  ```
  grep -r "mapbox-gl\|mapboxgl" app/src --include="*.js" --include="*.less" --include="*.css"
  ```
  Expected false-positives to ignore: `@mapbox/mapbox-gl-draw` and `mapbox-gl-draw-circle`
  package name strings in `draw/draw.js` and `draw/helper.js` — these are correct library names
  that do not change.

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
