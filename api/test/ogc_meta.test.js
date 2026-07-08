/* global describe, it */

import assert from "node:assert/strict";
import fs from "node:fs";
import Ajv from "ajv";
import {
  buildCatalogSnapshot,
  buildRecord,
  filterCatalogRows,
  getLanguage,
  localize,
  pageRows,
  parseBbox,
  parseDatetime,
} from "../modules/ogc_meta/helpers.js";

const schemaPath = new URL("./fixtures/ogc_records/", import.meta.url);
const schemaFiles = [
  "landingPage.schema.json",
  "catalog.schema.json",
  "catalogs.schema.json",
  "recordGeoJSON.schema.json",
  "recordCollectionGeoJSON.schema.json",
];
const schemas = Object.fromEntries(schemaFiles.map((file) => [
  file,
  JSON.parse(fs.readFileSync(new URL(file, schemaPath), "utf8")),
]));
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  validateFormats: false,
});

for (const [id, schema] of Object.entries(schemas)) {
  ajv.addSchema(schema, id);
}

const req = {
  protocol: "http",
  originalUrl: "/ogc_meta/collections/mapx/items?limit=1",
  get(key) {
    if (key === "host") {
      return "api.mapx.localhost:8880";
    }
    return "";
  },
};

const row = {
  view_id: "MX-ABC12-ABC12-ABC12",
  project_id: "MX-PROJECT",
  projects_id: ["MX-PROJECT"],
  view_type: "vt",
  meta_multilingual: {
    view_title: {
      en: "English title",
      fr: "Titre francais",
    },
    view_abstract: {
      en: "<p>English abstract</p>",
      fr: "<p>Resume francais</p>",
    },
  },
  source_keywords: ["water"],
  source_keywords_gemet_multilingual: [
    {
      id: 123,
      en: "water",
      fr: "eau",
    },
  ],
  source_keywords_m49_multilingual: [
    {
      id: "CHE",
      en: "Switzerland",
      fr: "Suisse",
    },
  ],
  source_bbox: {
    lng_min: 5,
    lat_min: 45,
    lng_max: 11,
    lat_max: 48,
  },
  view_created_at: 1704067200,
  view_modified_at: 1704153600,
  range_start_at: 1704067200,
  range_end_at: 1704153600,
};
const rowNoBbox = {
  ...row,
  view_id: "MX-DEF34-DEF34-DEF34",
  project_id: "MX-OTHER",
  source_bbox: null,
  source_keywords: ["forest"],
  range_start_at: 1609459200,
  range_end_at: 1609545600,
};

const baseUrl = "http://api.mapx.localhost:8880/ogc_meta";
const collectionUrl = `${baseUrl}/collections/mapx`;

function assertValid(schemaId, data) {
  const validate = ajv.getSchema(schemaId);
  const valid = validate(data);

  assert.equal(
    valid,
    true,
    JSON.stringify(validate.errors, null, 2)
  );
}

function getLandingFixture() {
  return {
    title: "MapX OGC API - Records",
    description: "Public MapX view and source metadata exposed as OGC API records.",
    links: [
      {
        rel: "self",
        type: "application/json",
        title: "This document",
        href: baseUrl,
      },
      {
        rel: "conformance",
        type: "application/json",
        title: "Conformance",
        href: `${baseUrl}/conformance`,
      },
      {
        rel: "data",
        type: "application/json",
        title: "Collections",
        href: `${baseUrl}/collections`,
      },
    ],
  };
}

function getCatalogFixture() {
  return {
    id: "mapx",
    type: "Collection",
    title: "MapX public metadata",
    description: "Public MapX view and source metadata records.",
    itemType: "record",
    links: [
      {
        rel: "self",
        type: "application/json",
        title: "MapX public metadata",
        href: collectionUrl,
      },
      {
        rel: "items",
        type: "application/geo+json",
        title: "Records",
        href: `${collectionUrl}/items`,
      },
    ],
  };
}

describe("OGC metadata", () => {
  it("localizes multilingual objects with default fallback", () => {
    assert.equal(localize({ fr: "Bonjour", en: "Hello" }, "fr"), "Bonjour");
    assert.equal(localize({ en: "Hello" }, "de"), "Hello");
    assert.equal(localize("Plain", "fr"), "Plain");
  });

  it("selects query language before Accept-Language", () => {
    assert.equal(getLanguage({
      query: {
        lang: "fr",
      },
      headers: {
        "accept-language": "de-CH,de;q=0.9",
      },
    }), "fr");
  });

  it("falls back to English for unsupported languages", () => {
    assert.equal(getLanguage({
      query: {
        lang: "it",
      },
      headers: {},
    }), "en");
  });

  it("parses valid bbox values", () => {
    assert.deepEqual(parseBbox("5,45,11,48"), [5, 45, 11, 48]);
  });

  it("rejects invalid bbox values", () => {
    assert.throws(() => parseBbox("11,45,5,48"), /Invalid bbox/);
  });

  it("parses datetime instants and intervals as epoch seconds", () => {
    assert.deepEqual(parseDatetime("2024-01-01"), {
      start: 1704067200,
      end: 1704067200,
    });
    assert.deepEqual(parseDatetime("2024-01-01/2024-01-02"), {
      start: 1704067200,
      end: 1704153600,
    });
  });

  it("builds a GeoJSON OGC record from a public search row", () => {
    const record = buildRecord(row, {
      language: "fr",
      baseUrl: "http://api.mapx.localhost:8880/ogc_meta",
      collectionUrl: "http://api.mapx.localhost:8880/ogc_meta/collections/mapx",
      req,
    });

    assert.equal(record.type, "Feature");
    assert.equal(record.id, row.view_id);
    assert.deepEqual(record.bbox, [5, 45, 11, 48]);
    assert.equal(record.properties.title, "Titre francais");
    assert.equal(record.properties.description, "Resume francais");
    assert.equal(record.properties.themes[0].concepts[0].title, "eau");
    assert.equal(record.links[2].href, "http://app.mapx.localhost:8880/static.html?views=MX-ABC12-ABC12-ABC12&zoomToViews=true");
  });

  it("validates representative responses against vendored OGC schemas", () => {
    const record = buildRecord(row, {
      language: "fr",
      baseUrl,
      collectionUrl,
      req,
    });
    const recordCollection = {
      type: "FeatureCollection",
      timeStamp: "2026-07-08T00:00:00.000Z",
      numberMatched: 1,
      numberReturned: 1,
      features: [
        record,
      ],
      links: [
        {
          rel: "self",
          type: "application/geo+json",
          title: "This document",
          href: `${collectionUrl}/items?limit=1`,
        },
      ],
    };

    assertValid("landingPage.schema.json", getLandingFixture());
    assertValid("catalog.schema.json", getCatalogFixture());
    assertValid("catalogs.schema.json", {
      collections: [
        getCatalogFixture(),
      ],
      links: [
        {
          rel: "self",
          type: "application/json",
          title: "Collections",
          href: `${baseUrl}/collections`,
        },
      ],
    });
    assertValid("recordGeoJSON.schema.json", record);
    assertValid("recordCollectionGeoJSON.schema.json", recordCollection);
  });

  it("builds a versioned catalog snapshot", () => {
    const snapshot = buildCatalogSnapshot([row, rowNoBbox], {
      updatedAt: "2026-07-08T00:00:00.000Z",
      version: 1,
    });

    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.updated_at, "2026-07-08T00:00:00.000Z");
    assert.equal(snapshot.count, 2);
    assert.deepEqual(snapshot.records.map((item) => item.view_id), [
      "MX-ABC12-ABC12-ABC12",
      "MX-DEF34-DEF34-DEF34",
    ]);
  });

  it("filters cached catalog rows and keeps exact numberMatched possible", () => {
    const rows = [row, rowNoBbox];

    assert.deepEqual(
      filterCatalogRows(rows, { id: "MX-ABC12-ABC12-ABC12" }).map((item) => item.view_id),
      ["MX-ABC12-ABC12-ABC12"]
    );
    assert.deepEqual(
      filterCatalogRows(rows, { q: "forest" }).map((item) => item.view_id),
      ["MX-DEF34-DEF34-DEF34"]
    );
    assert.deepEqual(
      filterCatalogRows(rows, { bbox: [4, 44, 12, 49] }).map((item) => item.view_id),
      ["MX-ABC12-ABC12-ABC12"]
    );
    assert.deepEqual(
      filterCatalogRows(rows, { datetime: { start: 1704067200, end: 1704067200 } }).map((item) => item.view_id),
      ["MX-ABC12-ABC12-ABC12"]
    );
  });

  it("pages cached catalog rows without changing total count", () => {
    const rows = [row, rowNoBbox];
    const page = pageRows(rows, {
      limit: 1,
      offset: 1,
    });

    assert.equal(rows.length, 2);
    assert.deepEqual(page.map((item) => item.view_id), [
      "MX-DEF34-DEF34-DEF34",
    ]);
  });
});
