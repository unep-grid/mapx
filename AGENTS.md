# MapX agent guide

This file applies to the whole repository unless a deeper `AGENTS.md` provides
more specific instructions. Historical code is a migration constraint, not an
architectural precedent for new work.

## Working method

- Start from user-provided files, constraints, and legacy gotchas, then verify
  the relevant architecture, call chain, helpers, tests, and current worktree.
  Search for an existing implementation before adding a helper, abstraction,
  dependency, or public interface. Ask if structure is not clear.
- Preserve unrelated and pre-existing changes. Never discard or rewrite a dirty
  worktree to simplify a task.
- Keep the requested scope. Do not turn a focused change into an unrequested
  legacy refactor; isolate legacy behind a small adapter when necessary.
- Prefer the smallest cohesive implementation. Keep code readable, auditable,
  KISS, and DRY without speculative abstractions or duplicated methods.

## Architecture direction

- R is a compatibility and orchestration layer. New authorization, data access,
  filtering, transformation, and business decisions belong in Node, the API,
  or Socket.IO. Move fragile R logic incrementally when its feature is touched.
- The server session is the source of truth for identity and access. Never trust
  roles, project access, or authorization decisions supplied by the browser or
  forwarded from R.
- Use explicit ESM imports and exports. Do not expose new mutable state or APIs
  through `window`, `globalThis`, or other application globals.
- Reuse established modern boundaries and helpers before creating alternatives.
  New windows use the `<mx-window>` system rather than legacy modal helpers.

## New frontend code

- Do not use jQuery, Selectize, implicit Shiny widget binding, or other legacy
  global plugins. Use native controls by default and Tom Select only when a
  native control cannot meet the interaction requirements.
- Do not discover owned UI through global `document.get*`,
  `document.querySelector*`, or similar calls. Inject the application root,
  retain direct element references, and scope any necessary lookup to the
  component that owns the DOM.
- Prefer Web Components for reusable or encapsulated UI. Keep lifecycle,
  listeners, observers, focus behavior, and cleanup explicit.
- Add JSDoc types or TypeScript for new modules and public interfaces. Pass DOM
  nodes or typed data across boundaries; do not add arbitrary HTML-string APIs.
- Protect performance: avoid redundant rendering, duplicate listeners, hidden
  polling, unnecessary network calls, and dependencies that duplicate existing
  capabilities.

## Legacy migration

- Existing jQuery, Shiny, Selectize, global DOM access, and legacy modal code may
  remain until its owning feature is migrated. Their presence nearby is not
  permission to use them in new code.
- When a legacy entry point must remain, keep it as a thin compatibility bridge
  to a modern module. Do not place new feature logic in the bridge.
- Do not weaken modern code to accommodate automatic legacy initialization.
  Disable or bypass the legacy behavior at a clear boundary instead.

## Validation

- Test essential behavior and regression-prone boundaries. A bug fix requires a
  regression test when the behavior can be exercised deterministically.
- Run the checks proportional to the change: targeted tests while developing,
  then the relevant ESLint, Vitest, production build, API lint, SQL review, or R
  parse checks before handoff.
- Never make a failing check pass by removing coverage, weakening assertions, or
  broadening an exception without documenting and justifying the tradeoff.
- Run `git diff --check` and report validations performed and any validation that
  could not be run.
