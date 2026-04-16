# Theme Core Refactor

## Goal

Make `submodules/mapx-style/packages/theme-core`, published and consumed as `@unep-grid/mapx-style`, the single owner of:

- built-in MapX themes
- theme validation, cloning, normalization, and integration shaping
- theme-to-style and theme-to-CSS resolution
- map style runtime primitives
- glyph, sprite, icon, and font asset manifests
- runtime asset resolution for package-owned style assets

Keep the app responsible for orchestration only:

- remote/local/session theme persistence
- project/theme precedence rules
- query parameter parsing
- theme editor UI and modal logic
- app events, sounds, and panel button interactions
- project-specific theme CRUD

The app must expose one theme authority. The rest of the app should talk to `theme`, not directly to `MapxStyle`.

## Status Snapshot

### Completed

- `@unep-grid/mapx-style` is now the package name used by the app
- built-in theme runtime ownership moved to `@unep-grid/mapx-style`
- `Theme` is the app-facing style authority
- `Theme` now owns the `MapxStyle` runtime internally
- direct app-side `mapxStyle.setTheme(...)` flows have been removed
- app runtime font metadata/loading now comes from `@unep-grid/mapx-style`
- `app/src/js/theme/fonts.js` has been removed
- legacy app-owned font sync/docs/assets under `app/src/fonts` have been removed
- package-owned font asset resolution now has an explicit `local` / `s3` contract
- theme-related runtime actions in app modules now go through `theme.*`

### Still pending

- move from local package font paths to S3-backed published font URLs
- add focused contract tests for startup precedence and theme/button synchronization
- remove duplicate built-in theme JSON files from the app once tooling dependencies are handled
- harden the package publish contract for font assets and generated artifacts

## Problem Statement

The current split is still messy and fragile:

- `Theme` exists in `app/src/js/theme/index.js`, but `MapxStyle` also exposes `setTheme()`, so the app effectively has two theme entry points
- `MapxStyle` is imported and manipulated outside the app theme layer
- `init_theme.js` only constructs the app `Theme`, while `init_mapx_style.js` constructs a separate style runtime with overlapping responsibility
- theme ownership is split between app orchestration and package runtime, which makes startup precedence and synchronization hard to reason about
- fonts are still split:
  - app theme UI uses `app/src/js/theme/fonts.js`
  - font CSS lives in `app/src/fonts/css`
  - fonts are fetched from `fonts.gstatic.com`
  - but glyphs and sprites are already package-owned and S3-backed

This is not maintainable. Theme application, theme state, and style runtime are coupled, but the code treats them as parallel systems.

## Architectural Decision

### One theme authority in the app

The app `Theme` service is the only public theme API inside the app.

That means:

- `theme.set(...)` is the only supported way to change the active theme in app mode
- panel controls, URL handling, project initialization, state restore, story mode, and editor flows must call `theme`
- app code should not call `mapxStyle.setTheme(...)` directly except from within the theme subsystem

### `MapxStyle` becomes a runtime dependency, not a peer controller

`MapxStyle` should still live in `@unep-grid/mapx-style`, but inside the app it should be owned by the theme subsystem.

Practical consequence:

- `init_mapx_style.js` should disappear as a standalone theme runtime entry point
- `MapxStyle` instance creation/binding should move under `app/src/js/init_theme.js` or `app/src/js/theme`
- the app `Theme` service should receive or create the `MapxStyle` instance and be responsible for syncing the active theme into it

This gives one chain of responsibility:

```text
URL / project / user action
  -> app Theme service
  -> shared theme-core helpers
  -> MapxStyle runtime
  -> map layers + CSS + asset loading
```

Not:

```text
URL / project / user action
  -> app Theme service
  -> some code paths also call MapxStyle directly
  -> two state owners drift
```

## Target Ownership

### `@unep-grid/mapx-style` owns

- built-in theme catalog
- theme model helpers
- theme validation
- clone/normalize helpers
- `getForIntegration()`
- CSS resolver
- layer resolver
- style builder
- `MapxStyle` runtime implementation
- sprite/icon metadata and runtime helpers
- font manifest
- font family and map-font metadata
- runtime asset base URL resolution
- generated asset descriptors for glyphs, sprites, and bundled web fonts

### App owns

- `ThemeService` backend communication
- merged theme registry across built-in, DB, local, and session themes
- storage priority and collision rules
- query/project/theme precedence
- theme modal/editor
- `tree` / `water` / `dark` resolver logic tied to app buttons
- app event bindings and sounds
- creation of the app singleton `theme`

### App must not own anymore

- built-in theme JSON copies
- font manifests
- font CSS source of truth
- direct webfont vendor URLs
- direct `MapxStyle` control outside the theme subsystem

## Core Rules

### Rule 1

`@unep-grid/mapx-style` is the only source of built-in theme JSON.

The app must not keep a second runtime copy under `app/src/js/theme/themes`.

### Rule 2

Inside the app, `theme` is the only supported theme controller.

The app should not import `MapxStyle` in arbitrary modules and call `setTheme()` from there.

### Rule 3

`MapxStyle` is an internal runtime owned by the app theme subsystem.

In app mode:

- `Theme` owns the active theme state
- `Theme` is responsible for applying the active theme to `MapxStyle`
- `MapxStyle` should not decide precedence between URL theme, project theme, or user theme

### Rule 4

Built-in themes from `@unep-grid/mapx-style` are immutable canonical data.

Any editable, decorated, or runtime-applied theme must be cloned or normalized first.

### Rule 5

Fonts are style assets and therefore package-owned.

Glyphs and sprites can remain S3-backed because `MapxStyle` controls those requests.
Web fonts cannot, because browser-managed `@font-face` requests cannot attach the
required HCP `Authorization: AWS all_users:` header.

### Rule 6

No runtime dependency on Google-hosted fonts.

`app/src/fonts/css/*.css` pointing to `fonts.gstatic.com` is transitional debt and must be removed.

The target is:

- font metadata in `mapx-style`
- generated webfont CSS or manifest in `mapx-style`
- bundled font files emitted by the app build
- app consumes package APIs only

## Desired App Shape

Suggested target structure:

```text
app/
  src/js/init_theme.js
    -> create Theme singleton
    -> create or inject MapxStyle runtime
    -> expose one app-level theme authority

  src/js/theme/
    index.js
      -> app Theme orchestrator
      -> imports shared helpers from @unep-grid/mapx-style
      -> owns precedence, registry, persistence, UI integration
      -> applies active theme to owned MapxStyle runtime

submodules/mapx-style/packages/theme-core/
  src/
    theme_registry.js
    theme_model.js
    theme_validation.js
    theme_fonts.js
    theme_assets.js
    mapx_style.js
```

## Desired Runtime Shape

### App `Theme` should expose

- `init()`
- `get()`
- `set(themeOrId, opt?)`
- `preloadThemes()`
- `register()`
- `registerBatch()`
- `getRemote()`
- `getForIntegration()`
- button sync helpers
- font loading orchestration for current theme

### `MapxStyle` should expose

- low-level style/runtime capabilities
- `attachMap()`
- `detachMap()`
- `getStyle()`
- `setTheme(normalizedTheme)`
- asset helpers for sprites/icons

### `MapxStyle` should not own in app mode

- active theme precedence
- remote/custom theme lookup
- project/query resolution rules
- editor-facing theme registry behavior

## Theme Lifecycle

The target lifecycle is:

1. `init_theme.js` parses URL query parameters.
2. `init_theme.js` creates the app `Theme` singleton.
3. `Theme` constructs or receives the `MapxStyle` runtime.
4. `Theme.init()` loads built-in and persisted themes.
5. `Theme` resolves initial precedence:
   - URL theme overrides project theme
   - project theme overrides default theme
   - custom theme IDs are resolved through the app registry
6. `Theme.set()` stores active theme state.
7. `Theme.set()` pushes normalized theme data into `MapxStyle`.
8. `Theme.set()` updates CSS, buttons, URL, and app events.

This removes the current ambiguity where startup logic is split between:

- `init_theme.js`
- `init_mapx_style.js`
- `map_helpers/index.js`
- late direct `mapxStyle.setTheme(...)` calls

## Fonts

### Target

Fonts become fully owned by `@unep-grid/mapx-style`.

That includes:

- source metadata
- family listing
- map font naming
- generated `@font-face` CSS or manifest
- webfont file hosting on S3
- runtime font loading helpers

### Current anti-patterns to remove

- `app/src/js/theme/fonts.js` as the source of truth
- `app/src/fonts/css/*.css`
- hardcoded `fonts.gstatic.com` URLs
- duplicated family lists in app code
- separate handling of map glyphs and UI fonts

### Target API

```js
import {
  listFontFamilies,
  listFonts,
  loadFontFamily,
  loadThemeFonts,
  resolveFontAssetUrl,
} from "@unep-grid/mapx-style";
```

### Hosting model

Suggested model:

- font source metadata remains in the `mapx-style` repo
- theme-core imports the required `.ttf` files directly
- Vite emits those files as app-served assets during the app build
- runtime package helpers inject `@font-face` CSS pointing to bundled asset URLs
- app never references Google font CDNs directly

### Package contract

The package must define:

- where font source metadata lives
- what generated artifacts are produced
- what is published in `files`
- what is exposed in `exports`
- what runtime code loads locally published CSS vs remote S3 CSS

## Sprites, Glyphs, and Fonts Should Be Symmetric

The style asset model should be unified:

- glyphs: package-owned, S3-hosted
- sprites: package-owned, S3-hosted
- web fonts: package-owned, app-served bundled assets

Anything else keeps style assets fragmented across repos and hosting models.

## Migration Plan

### Phase 1: Collapse app theme entry points

Status: completed

- move `MapxStyle` ownership under `init_theme.js` or `app/src/js/theme`
- stop treating `init_mapx_style.js` as a separate top-level theme runtime entry
- define the app `theme` singleton as the only public theme controller
- replace direct app imports/usages of `mapxStyle.setTheme(...)` with theme-owned flows

### Phase 2: Finalize shared theme-domain helpers

Status: completed for current runtime needs

- keep built-in theme registry in `@unep-grid/mapx-style`
- keep clone/normalize/validation helpers there
- keep `getForIntegration()` there
- ensure app `Theme` only orchestrates, not reimplements domain logic

### Phase 3: Remove built-in theme duplication from app

Status: runtime completed, file cleanup still pending

- stop runtime use of `app/src/js/theme/themes/*`
- remove duplicate built-in JSON from the app once tooling dependencies are handled
- keep app registry arrays only for merged built-in/custom instances

### Phase 4: Refactor app `Theme` into the true controller

Status: completed

- make `Theme` own the `MapxStyle` instance
- make `Theme.set()` the only path that applies active theme to the map runtime
- keep resolver/storage/UI logic in app
- remove residual map-style control logic from unrelated modules

### Phase 5: Move fonts into `@unep-grid/mapx-style`

Status: runtime cutover completed, repository cleanup still pending

- move font manifest and family lists out of the app
- remove `app/src/js/theme/fonts.js`
- decommission app-owned font sync/docs/tooling
- remove `app/src/fonts/css`
- generate package-owned CSS/manifest artifacts
- bundle font files through the app build
- load fonts through package APIs only

### Phase 6: Unify asset URL strategy

Status: not started

- use one package-owned resolver strategy for glyphs, sprites, and fonts
- version asset URLs consistently
- document local-dev vs S3-prod behavior

### Phase 7: Cleanup and compatibility

Status: in progress

- keep temporary compatibility wrappers only where required
- document that `theme` is the only app theme API
- remove stale imports and residual direct runtime theme control

## Explicit Anti-Patterns

The refactor is not complete if any of these remain:

- app code directly calling `mapxStyle.setTheme(...)` outside the theme subsystem
- app code importing `MapxStyle` for theme-state concerns
- runtime reliance on app-local built-in theme JSON
- runtime reliance on `app/src/js/theme/fonts.js`
- runtime reliance on `app/src/fonts/css`
- `fonts.gstatic.com` in shipped font CSS

## Tests to Add

- contract test that the app theme service is the only path applying active theme in app initialization
- contract test that URL theme overrides project/default theme
- contract test that project/view state restore does not override a URL theme
- contract test that button state reflects the active theme after initialization
- package tests for built-in theme immutability and normalization
- package tests for font manifest integrity
- package tests that declared S3-backed font assets resolve correctly

## Next Implementation Slice

Recommended next coding slice:

1. add focused tests for URL theme precedence and button/theme sync
2. remove duplicate built-in theme JSON files from the app once no tooling depends on them
3. harden the published package contract for font assets and generated artifacts
4. harden the bundled webfont packaging contract in published `@unep-grid/mapx-style`
5. document the package asset contract alongside sprite/glyph publishing

This slice turns the current runtime cutover into a maintained contract instead of a partially migrated repository.
