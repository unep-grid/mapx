# SDK refactor plan: testing, test data, developer tokens

Status: proposal, to resume after the 1.14.2 release. 

## Context

The SDK wraps a MapX iframe (app mode: R/Shiny, or `static.html`) and talks to
it with `postMessage`. Many external platforms depend on it. Coverage today:

- **Unit/contract tests**: Vitest + jsdom (`src/*.test.js`,
  `src/mapx_resolvers/*.test.js`), run by `npm run test:sdk` in `app`.
- **Manual random suite**: `tests/index.js` (about 1600 lines), served by
  `live-server`, needs a running MapX instance, picks random projects and
  views ("shake it to break it"), and asks for a session token with
  `prompt()` and then `set_token`.

## Findings that shape the plan

- **Static mode needs no authentication.** It is the mode most external
  integrators use and the one most issues hit, so end-to-end tests can start
  there without any token work.
- **Session tokens are issued by R** (`app/src/r/helpers/login_utils.R`, an
  encrypted `{key, is_guest, valid_until}`), and validated by Node
  (`api/modules/authentication/helpers.js`: `validateToken`, `validateUser`).
  HTTP reads the token from body or query, Socket.IO from `handshake.auth`.
  There is no `Authorization` header support.
- **Global roles come from environment lists** of user ids (`root`, `dev`,
  `project_creator`). `developer` is a hybrid, project-scoped role:
  `publisher && isUserDeveloper(idUser)`.
- **Useful existing pieces**: `docker-compose.yml` (pg, api, app, mailhog),
  `pg/init/sql_files` (schema and base data), `api/modules/migrate` (SQL
  patches), GitHub workflows (`build.yml`, `quality.yml`), and
  `@vitest/browser` already in `app` devDependencies (2.x, unused).

## Recommended order

```
1 Clean up existing suite ──► 2 Playwright, static mode ◄── 3 Versioned seed data
                                       │
                                       └──► 4 App mode auth (mailhog) ──► 6 Full migration
5 Developer tokens: independent; later feeds scripts, headless use and phase 6
```

Developer tokens must not block end-to-end testing: static mode needs no auth,
and app mode can log in through the normal flow (phase 4) without adding any
new attack surface.

## Framework choice

| Option | Verdict |
|---|---|
| **Playwright Test** | **Chosen for E2E.** Mature, handles cross-origin iframes (`frameLocator`), `webServer`, `storageState`, traces and video in CI, network interception, Chromium/Firefox/WebKit. A test drives a minimal host page that loads `dist/mxsdk.umd.js` and calls `mapx.ask()` through `page.evaluate`, which is exactly what an integrator does. |
| Vitest Browser Mode | Good for component tests in a real browser, but still experimental in the installed 2.x and weaker for E2E diagnostics (no traces). Keep it for later component work (`<mx-window>`, etc.), not for the SDK. |
| WebdriverIO | No advantage here; heavier, weaker tracing. |
| Cypress | Rejected: cross-origin iframe support has historically been limiting. |

Target pyramid:

- **Vitest/jsdom**: Manager/Worker contract and resolvers with mocked helpers.
  Fast, deterministic, required for every bug fix.
- **Playwright**: real behaviour (MapLibre/WebGL) in static and app mode,
  against seeded data.
- **Random suite**: kept as a nightly smoke run against staging, not as a PR
  gate.

## Phases

### 1. Clean up the existing suite

- Remove `prompt()`/`set_token` from the default path; document the scripts.
- Inventory `tests/index.js` by resolver, as a backlog of deterministic tests.
- Check `test:sdk` runs in CI.

Done when: the backlog exists and no manual token is needed to run anything.

### 2. Playwright harness, static mode first

- Dedicated folder (e.g. `app/test/e2e-sdk/`), minimal host page, a `mapx`
  fixture (Manager created, `ready` awaited, destroyed after each test).
- Configurable `baseURL` (local stack, staging).
- **First, validate WebGL in headless Chromium** (SwiftShader/ANGLE flags):
  this is the main technical risk.
- First tests: Manager lifecycle, `ask` success/failure/timeout, view add and
  remove, filters, transparency, camera moves (covering the 1.14.2 fixes).

Depends on: a minimal seed (phase 3): one public project with a few vector
views.
Done when: green locally and in CI on Chromium, with traces kept on failure.

### 3. Reproducible test data

**Recommendation: a versioned seed, not a binary dump, and not yet project
export/import.**

| | PostgreSQL dump | Project export/import | Versioned seed (chosen) |
|---|---|---|---|
| Fidelity | Full | Good if complete | Targeted |
| Schema drift | High (stale after each patch) | Low if the format is versioned | None: applied, then migrated by `migrate` |
| Reviewable in PRs | No | Yes | Yes (SQL/JSON + GeoJSON) |
| Cost | Low at first | **High** (sources are tables, GeoServer, id remapping, ACLs, cross-project references) | Medium |

- Fixed, readable ids (`MX-TEST-…`); one user per role (member, publisher,
  admin, root); one public and one private project; views of every type
  (vt, rt, cc, gj, sm); widgets, custom code, a dashboard.
- Small GeoJSON sources imported by a script that reuses the existing upload
  path, rather than raw SQL.
- Loaded on top of `pg/init/sql_files` in a test compose profile/service.
- Project export/import remains a good product feature for later; it could
  generate these fixtures, but must not block testing.

### 4. App mode end-to-end authentication (no developer tokens needed)

- Playwright setup project: programmatic login of a seeded user through the
  email flow, reading the code from the mailhog API, saved as `storageState`
  and reused by tests.
- Removes the `set_token` hack from tests for good.

Done when: app mode tests (publisher, admin) are green in CI.

### 5. Developer tokens (security design first)

Uses: import/upload scripts, headless MapX, integrations, SDK tests.

Model:

- **Opaque random secret** (at least 32 bytes, `mxdt_` prefix so secret
  scanners can spot it). **Store only a hash** (SHA-256 is enough for a
  high-entropy secret). Shown once at creation.
- **Do not reuse the session token format**: it carries the user key and
  cannot be revoked individually.
- Table `mx_dev_tokens`: `id`, `id_user`, `name`, `token_hash`, `prefix`,
  `scopes`, `id_project` (nullable), `created_at`, `expires_at`
  (**mandatory**, capped, e.g. 90 days), `last_used_at`, `revoked_at`. Added
  through a `migrate` patch.
- **Permissions**: a token carries no role. On every use the server recomputes
  the owner's roles (`getUserRoles`, ideally with the same client/transaction
  as any write) and intersects them with the token scopes (read, upload, SDK
  session, ...). A token never exceeds its owner's current rights; removing a
  role takes effect immediately.
- **Transport**: `Authorization: Bearer` header (to add to
  `authentication/mw.js`) and Socket.IO `handshake.auth`. **Never in a query
  string** (logs, referrer).
- Revocation, usage logging (`mx_logs`), rate limiting (existing
  `rate_limiter`); optionally flag use from a new IP.
- **UI**: gated on the **global** `isUserDeveloper` check (the current
  `developer` role is project-scoped). List, create and revoke in an
  `<mx-window>`, text in `app/src/data/dict`.
- **App mode through the SDK**: an exchange endpoint that turns a developer
  token into a short-lived session (dedicated scope, minutes of validity).
  **Open decision**: Node would then issue sessions, which R does today. This
  fits the architecture direction but needs a design for the shared
  encryption key.
- **Local root token**: rather than a static documented root token, a
  command/routine that generates a token for a seeded user and writes it to
  `mapx.dev.env` (not versioned; template `mapx.dev.EXAMPLE.env`), and
  refuses to run outside dev mode.

Done when: API Vitest tests cover hashing, expiry, revocation, role
intersection and query-string rejection; a dedicated security review has
been done; an E2E test consumes a token.

### 6. Full migration of the SDK suite

Port the phase 1 backlog to Playwright, cover app and static modes, add
Firefox, keep the random suite as a nightly run against staging.

## Deferred from 1.14.2

- Generic `iframeAttributes` Manager option (e.g. `allow`, `referrerpolicy`),
  applied before `src` is set. 1.14.2 only adds `iframeTitle`.

## Main risks

- WebGL in headless CI: validate first in phase 2.
- CI cost of a full stack (R, GeoServer): start with static mode
  (api + pg + `static.html`), app mode next.
- SDK contract changes: version and document them (as done for `_err` and
  transparency in 1.14.2).
- Developer tokens are a new attack surface: do not ship without mandatory
  expiry, hashing, revocation and server-side role recomputation.
