# JavaScript and TypeScript quality

Use Node.js 22 and install the root tooling with `npm ci`. In MapX, initialize
both Git submodules with `git submodule update --init --recursive` first.
Each submodule also supports these commands in a standalone clone after its
own `npm ci`.

| Command | Purpose |
| --- | --- |
| `npm run format` | Format owned JS/TS with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run lint` | Check braces and applicable code-quality rules |
| `npm run lint:fix` | Apply available ESLint fixes; review the result |
| `npm run quality` | Run all quality checks without writing |

MapX root commands include both submodules. Their own commands work locally.
MapX also provides `format:local`, `format:check:local`, `lint:local`, and
`lint:fix:local` to check only the parent repository. App, API, and maintenance
package commands delegate to root tooling, so install the root dependencies
before invoking them. Nested app packages are covered by the app/root checks.

## Policy

`.prettierrc.json` is the formatting source of truth: two spaces, double quotes,
semicolons, trailing commas, and parentheses around arrow parameters. Eighty
columns is a wrapping target; strings and other indivisible constructs may be
longer. ESLint requires braces around control flow and permits concise arrow
expressions. Editor integrations should use the installed root Prettier and
ESLint versions, with the working directory set to the repository being edited.

ESM is the default. Existing CommonJS tools have explicit file overrides;
Webpack's `require()` calls in application modules do not make those modules
CommonJS. Converting tool module loading is a separate runtime change.

Formatting and brace checks cover all owned JS/TS, including tooling and tests.
The shared ignore file excludes generated output, dependencies, archives, and
local data. Build tests and build scripts are not excluded. This migration does
not enable recommended lint rules throughout legacy code: MapX preserves its
existing API check scope, app architecture restrictions, and SDK React checks.

## Keeping repositories aligned

The three repositories keep identical `.prettierrc.json` and
`quality/style.config.mjs` files and pin identical shared tool versions in their
manifests and lockfiles. Repository-specific ESLint environments and exclusions
may differ. Update the shared files and versions together; MapX's
`npm run quality:policy` detects drift and missing submodules.

CI runs quality checks on pull requests and pushes. MapX image builds/publishing
and submodule deployment/publishing also run behind quality checks. Configure
the code-quality check as required in GitHub branch protection to prevent
merging a failing PR; workflow files alone do not change repository settings.

## Mechanical normalization and blame

Keep configuration changes separate from mechanical code normalization. Review
lint fixes independently of behavioral changes; do not broadly disable rules
to make checks pass. Dedicated normalization commit hashes belong in each
repository's `.git-blame-ignore-revs`.

Enable ignored formatting revisions in each local clone with:

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

Submodule commits must be available on their remotes before merging a parent
commit that references them. Publish/review the submodule changes first, then
advance the MapX gitlinks.
