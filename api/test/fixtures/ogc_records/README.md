# OGC API Records Schema Fixtures

These JSON schemas are small local test fixtures derived from the official OGC
API - Records Part 1 schema files published at:

https://schemas.opengis.net/ogcapi/records/part1/1.0/openapi/schemas/

Source files checked on 2026-07-08:

- `landingPage.yaml`
- `catalogs.yaml`
- `catalog.yaml`
- `recordCollectionGeoJSON.yaml`
- `recordGeoJSON.yaml`

The official files are YAML and reference the broader OGC API Features schema
graph. These fixtures keep only the response structure that MapX emits for the
phase 1 OGC metadata endpoint, so tests stay offline and deterministic.

MapX intentionally keeps `numberMatched` and `numberReturned` required in the
record collection fixture, although the OGC base FeatureCollection schema marks
them optional. This is a local contract used to keep catalog pagination explicit.
