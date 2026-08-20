# Risks and observations

This is a living record of facts discovered during preliminary inspection. It
is intentionally separate from the phase checklists so later work does not
lose the reasoning behind them.

## Current observations

- Issue #757 describes the 2021–2022 state and is no longer a usable backlog.
- Approximately 17,000 lines of active R remain across 44 server files and 23
  helper files. The server contains roughly 117 Shiny observers and emits about
  66 custom client-message calls.
- The remaining work is concentrated in orchestration, login, projects,
  schemas, validation, view editors, source management, and reactive refreshes.
- `static.html` already initializes MapX without a Shiny session and is the
  strongest foundation for a common shell.
- The client already destroys and reconnects Socket.IO after a Shiny-mediated
  project change. The new implementation should preserve that boundary while
  moving the project decision into the server session.
- The API already owns many expensive or sensitive operations, including major
  source, project, view, GeoServer, upload, and editing workflows.
- The SDK manual suite is substantial: around 40 groups in a 1,624-line script.
  It is useful coverage, but not currently a deterministic CI gate.
- The API `routines` service applies roll-forward-only SQL patches on startup.
- Local `_shared` data is about 25 GB, dominated by PostgreSQL and userdata.
  A second full copy is expensive and unnecessary for the preliminary work.
- Most of the large local submodule footprint is ignored development/test data,
  not tracked source that a worktree must duplicate.

## Land mines

- Sharing `_shared/postgres` between two running PostgreSQL containers can
  corrupt the database. Share the service, never the live `PGDATA` process.
- Starting `routines` from a migration worktree may apply irreversible SQL
  patches and invalidate the promised application-only rollback.
- Running legacy and beta Socket.IO instances against the same Redis namespace
  may mix broadcasts, locks, or session state.
- Current Socket.IO authentication receives user, project, and token material
  from the browser. Validation exists, but this is not a substitute for a
  server-owned session.
- Roles stored on a socket are a connection-time snapshot. Sensitive mutations
  must refresh roles and resource ACLs from the database.
- Project switching is a race boundary. Late replies, editor locks, background
  jobs, and cached responses from the previous project must not affect the new
  project.
- The current SDK test asks for an encrypted token interactively and stores it
  in localStorage. Tokens are fingerprint-sensitive and unsuitable as the new
  authentication contract.
- Some SDK tests select random projects, views, or editable sources. The table
  editor test can mutate whichever source was selected and may not clean up if
  the suite aborts.
- The manual runner stops early and reports through DOM state, which can hide
  cleanup failures and prevents useful CI diagnostics.
- `set_token` and `get_token` are documented SDK methods even though they expose
  an obsolete authentication model. Their removal is a deliberate compatibility
  exception and needs release notes.
- `static.html` and the SDK are used by multiple external organizations. A
  change that appears internal may be a partner-facing breaking change.

## Code smells to address when touched

- Shiny acts simultaneously as session store, event bus, UI factory, validator,
  database layer, and workflow coordinator.
- The client still contains direct `Shiny.onInputChange` and custom-message
  bridges in otherwise modern modules.
- Large R helpers combine unrelated database, translation, HTML, schema, and
  authorization concerns, making line-by-line ports unsafe.
- The current reactive graph relies on implicit invalidation and shared mutable
  `reactData`/`reactUser`/`reactChain` state. Reproducing it mechanically in
  JavaScript would preserve its hidden coupling.
- API Socket.IO routes are registered in a large central entry point, which is
  likely to become a merge hotspot during parallel work.
- Some authorization helpers rely on socket role snapshots. Durable writes need
  a consistent current-role check at the database boundary.
- The SDK exposes testing-oriented internal actions such as generic editor
  method execution. Test utilities should not expand the public SDK surface.
- Client test helpers and the SDK manual runner have custom assertion, timeout,
  queue, and reporting logic already provided by Playwright.
- Authentication terminology mixes cookies, localStorage tokens, API tokens,
  browser fingerprints, and Socket.IO auth payloads. The migration must name
  and separate these concepts explicitly.

## Deferred work

- Export/import of complete projects for portable CI fixtures.
- A compact representative database snapshot.
- Production cutover and removal of legacy deployment artifacts.
- Broader cleanup of unrelated legacy frontend patterns.

