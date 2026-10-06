# Vector upload: follow-up

The failure cleanup is now "ordered compensation" (`discard.js`): on any
error in `save()`, one transaction deletes the view, the `mx_sources` rows
(all revisions) and drops the table, even when the source was never
registered. Temporary files and chunk directories are removed in `finally`.
This covers normal failures, not a process crash or kill mid-pipeline.

## Atomic import (staging schema)

The three writes use separate connections: the table through
`sh/import_vector.sh` (ogr2ogr | psql), `mx_sources` through `registerSource`,
`mx_views` through `insertRow`. Target design:

1. ogr2ogr writes into a staging schema (`mx_upload.<idSource>`).
2. Validation and attribute scoring run on the staging table.
3. One Node transaction: `ALTER TABLE … SET SCHEMA public`, `registerSource`
   (already accepts a client), view insert (`insertRow` needs a `client`
   parameter), `COMMIT`.
4. Client notifications after commit, non-fatal.
5. Failure: `DROP TABLE IF EXISTS mx_upload.<id>`; a janitor drops staging
   tables older than N hours and never guesses about `public`.

## Interruptions

- HTTP client disconnect is not detected: the pipeline runs to the end with
  nobody listening. Abort on `res` `close` (not `writableFinished`) and socket
  `disconnect`, kill ogr2ogr (and psql: process group) and go through the
  normal cleanup.
- No timeout on ogr2ogr / psql.
- Server restart mid-pipeline leaves tables / rows / files: needs a startup
  and periodic janitor (staging tables, `settings.vector.path.temporary`,
  `os.tmpdir()/<id_request>` chunk directories, abandoned chunked uploads).

## Pipeline issues found in review

- `/server/source/added` and `/server/view/add` (`mx_emit_ws_response`) are
  fatal: a dead socket client makes the upload fail after a 60 s timeout and
  rolls everything back; the client may keep a ghost view. Send after
  everything is committed, log failures. `emitSocketResponse` never clears its
  timeout (`io/mw_emitter.js`).
- `tableHasValues` only inspects the first row and treats `0`, `""`, `false`
  as empty: valid layers can be rejected.
- `registerOrRemoveSource`: the `count === 0` branch calls `removeSource` on
  an unregistered source, which always throws. Its `count(*)` runs on `pgRead`
  (20 s `statement_timeout`), too short for large tables.
- `fileToPostgres`: `onProgress` / `onVerbose` / `onMessage` promises are not
  awaited; a rejection is unhandled.
- HTTP contract: failures after the stream started still end with status 200;
  clients must parse `"level":"error"`. Document it or emit a final status
  record.
- `removeSource` / `withTransaction`: a `ROLLBACK` error masks the original
  error and the broken client is released to the pool.
- `newIdSource` uses `Math.random`; use `crypto`. A collision is now refused
  before the import (`save()` guard).
- `import_vector.sh` keeps `-skipfailures`: invalid features are dropped
  silently.

## Orphans created before the fix

Read-only checks, to run before removing anything by hand.

Tables named like a source id without registration:

```sql
SELECT t.table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name ~ '^mx(_[a-z0-9]{5}){5}$'
  AND NOT EXISTS (SELECT 1 FROM mx_sources s WHERE s.id = t.table_name);
```

Registered vector sources used by no view (includes legitimate ones: review
by date and title):

```sql
SELECT s.id, s.date_modified, s.data #>> '{meta,text,title,en}' AS title
FROM mx_sources_latest s
WHERE s.type = 'vector'
  AND NOT EXISTS (
    SELECT 1 FROM mx_views_latest v
    WHERE v.data #>> '{source,layerInfo,name}' = s.id
  )
ORDER BY s.date_modified DESC;
```
