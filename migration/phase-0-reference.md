# Phase 0: establish the reference

## Goal

Create a reliable behavioral reference for the current Shiny application and a
decision-ready inventory of what still has to move.

## Work

- Replace the manual SDK test entry point with a small Vite host and Playwright
  runner. Continue driving MapX through `mapx.ask()` so the tests exercise the
  same boundary used by external integrations.
- Convert only the blocking SDK scenarios first. Keep the existing manual suite
  temporarily for the long tail.
- Make test targets, users, projects, views, and sources configurable. Remove
  random selection from migrated tests.
- Use dedicated E2E resources for mutations and guarantee cleanup in teardown,
  including after a failed test.
- Add an authentication fixture with two adapters:
  - legacy: a CLI tool creates an ephemeral encrypted token for the Playwright
    browser fingerprint;
  - Node: the same fixture will later seed a Redis-backed server session and
    install its HttpOnly cookie.
- Keep secrets out of URLs, browser bundles, logs, screenshots, and reports.
  Do not add an HTTP authentication bypass.
- Exercise the real email/code and magic-link flows in separate tests, using
  MailHog locally.
- Deprecate the SDK `set_token` and `get_token` resolvers. They are test-era
  authentication helpers and are not compatible with an HttpOnly server
  session.
- Build a capability inventory mapping each R observer/helper and Shiny bridge
  to its user workflow, Node/client owner, authorization needs, existing tests,
  dependencies, and migration status.
- Score each capability independently for frequency, business impact, support
  value, security/data impact, Node readiness, effort, and testability.

Initial E2E coverage should include the SDK handshake, static mode,
authentication, Socket.IO, project switching, view lifecycle, language,
themes, sharing, one view editor, one source/table editor, and a short chaos
test.

## Validation gate

Phase 0 is complete when:

- the selected Playwright suite passes against the unchanged Shiny application;
- every mutating test uses named E2E data and has verified cleanup;
- guest and authenticated setup run without interactive prompts;
- the capability inventory has an owner, priority, and acceptance evidence for
  every active Shiny workflow;
- the beta scope and explicitly deferred capabilities have been reviewed;
- issue #757 links to this migration documentation; and
- the team can freeze functional development and start the cutover without an
  unresolved architectural decision.

