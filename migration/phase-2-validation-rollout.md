# Phase 2: validate and roll out

## Goal

Demonstrate behavioral parity for the accepted beta scope, then deploy a
reversible Node-only beta to staging.

## Work

- Run the same Playwright scenarios against the legacy and Node targets. Only
  the authentication adapter should differ.
- Add Node-specific regression tests for session expiry and rotation, role
  changes during a connection, rejected project access, late Socket.IO
  responses, network reconnection, logout, and root impersonation recovery.
- Cover the main guest, member, publisher, admin, root, and impersonated-user
  paths.
- Run frontend, SDK, and API unit tests; lint; production build checks; and a
  modest concurrent-connection smoke test.
- Inspect logs and browser output for unhandled rejections, duplicate listeners,
  authorization failures, stale updates, and cleanup leaks.
- Deploy the frontend and API as one versioned unit on staging. Keep the legacy
  images and deployment configuration available for rollback.
- Namespace beta Redis sessions and Socket.IO channels so they cannot mix with
  legacy state.

## Validation gate

Phase 2 is complete when:

- every capability accepted for the beta has passing automated evidence and a
  successful manual smoke test;
- session, ACL, data-integrity, static-mode, SDK, and rollback checks all pass;
- production assets build without the Shiny bundle;
- no database migration or userdata conversion is required by the beta;
- staging runs without R; and
- rollback restores the matching legacy frontend/API pair without restoring
  PostgreSQL or volumes.

If any session/ACL, data-integrity, SDK/static, or rollback gate fails, keep the
beta local and continue stabilization rather than deploying by date.

