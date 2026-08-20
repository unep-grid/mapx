# Shiny to Node.js migration

This directory records the preliminary plan for removing the R/Shiny runtime
from MapX. It replaces the outdated assumptions in
[issue #757](https://github.com/unep-grid/mapx/issues/757) with a plan based on
the current application.

The target is a beta of the authenticated MapX application served by `api`,
with no R process. Development may be incremental, but the deployed beta must
not depend on a temporary R bridge.

## Phases

1. [Phase 0: establish the reference](./phase-0-reference.md)
2. [Phase 1: replace the Shiny runtime](./phase-1-node-cutover.md)
3. [Phase 2: validate and roll out](./phase-2-validation-rollout.md)

Cross-cutting findings are kept in
[Risks and observations](./risks-and-observations.md). The capability inventory
and acceptance matrix will be created during Phase 0, rather than guessed in
this preliminary plan.

## Working principles

- Preserve `/static.html`, URL parameters, SDK messaging, and existing partner
  integrations.
- Treat the server session and current database state as the source of truth
  for identity, project access, and roles.
- Reconnect Socket.IO after a project change so the new connection receives a
  fresh authorization context.
- Keep the database and userdata formats backward compatible during the beta.
- Score capabilities by business, support, security, and data impact. Low
  frequency alone is not a reason to defer a feature.
- Prefer a short feature freeze during implementation. Keep unrelated work out
  of the migration branch.
- Quality gates override the target date.

## Overall completion goal

The migration is complete only when the accepted capability matrix passes on a
Node-only deployment, the static application and SDK remain compatible, and
the legacy application can be restored without a database or volume rollback.

