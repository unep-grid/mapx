# MapX API

## Tests

API tests use Vitest in a Node environment:

-   `npm test` runs the test suite once.
-   `npm run test:watch` reruns affected tests while developing.
-   `npm run test:coverage` runs the suite and writes coverage reports to
    `coverage/` without enforcing a percentage threshold.

Unit tests are colocated with their owning modules and named `*.test.js`.
Import `describe`, `it`, `expect`, and `vi` explicitly from `vitest`. Mock
infrastructure dependencies at the module boundary so the default suite does
not require MapX environment variables or live PostgreSQL, Redis, GeoServer,
or other external services.

Service-backed integration tests should also use Vitest, but require a
separate configuration and lifecycle command before being added to the
default CI workflow.
