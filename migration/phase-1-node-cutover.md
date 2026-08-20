# Phase 1: replace the Shiny runtime

## Goal

Run the accepted authenticated MapX workflows from the frontend and `api`
without starting R/Shiny.

## Work

### Environment

- Develop on a dedicated branch in a neighboring worktree.
- Reuse the existing local PostgreSQL, GeoServer, Search, and `_shared` data.
  Never start two PostgreSQL services against the same `PGDATA`.
- Give the Node-only stack separate hosts, ports, and Redis state. Disable its
  `routines` service while it shares the legacy database.
- Do not add SQL patches or incompatible userdata formats during the cutover.

### Application shell

- Use the existing static shell as the common frontend foundation.
- Serve `/`, `/static.html`, application assets, and the SDK from Express.
- Keep `/static.html`, its URL parameters, and the partner-facing SDK protocol
  compatible, except for the documented removal of `set_token`/`get_token`.
- Replace Shiny reactivity with explicit bootstrap and targeted state updates.
  Do not introduce a second generic reactive framework.
- Replace Shiny inputs and custom messages with direct module calls or explicit
  HTTP/Socket.IO contracts.
- Hide deferred capabilities completely; do not leave dead controls.

### Session and authorization

- Store sessions in Redis and identify them with an opaque HttpOnly cookie.
- Implement bootstrap, login request/verification, magic actions, logout,
  project switching, and root impersonation in Node.
- Protect session mutations against CSRF, validate origins, rate-limit login,
  rotate the session identifier after privilege changes, and audit
  impersonation.
- Share the session middleware with Socket.IO. Resolve current roles on the
  server and synchronize `socket.session` and `socket.data`.
- On project change, validate access, persist the project, destroy the old
  socket, and reconnect. Ignore late responses from the previous connection.
- Revalidate every durable mutation server-side using current roles and ACLs,
  preferably in the same database transaction as the write.

### Feature migration

- Port schemas and authoritative validation to Node using JSON Schema/AJV.
  Resolve translated labels on the client from the existing dictionaries.
- Split parallel work by stable ownership: integration/session, auth/projects,
  views/editors, and sources/tools.
- Keep central interfaces stable before parallel feature work begins, and avoid
  overlapping edits to shared entry points.
- Remove the Shiny bundle only after active Shiny calls, handlers, and runtime
  dependencies reach zero.

## Validation gate

Phase 1 is complete when:

- the application starts and serves both `/` and `/static.html` with no R
  container or process;
- the accepted guest and authenticated workflows pass against the Node target;
- project switching produces a new Socket.IO authorization context and cannot
  reuse the old project's privileges;
- server-side checks reject unauthorized reads and writes even when client
  state or payloads are forged;
- all blocking schemas and live validations behave like the reference;
- no accepted workflow calls Shiny, and deferred workflows have no visible
  entry point; and
- the legacy application can still run against the unchanged database and
  userdata.

