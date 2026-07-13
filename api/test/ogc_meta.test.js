/* global describe, it */

import assert from "node:assert/strict";
import fs from "node:fs";
import Ajv from "ajv";
import {
  buildCatalogSnapshot,
  buildCatalogMetadata,
  buildRecord,
  filterCatalogRows,
  getLanguage,
  localize,
  pageRows,
  parseBbox,
  parseDatetime,
} from "../modules/ogc_meta/helpers.js";
import { buildPycswRecord } from "../modules/ogc_meta/pycsw_helpers.js";

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
    source_notes: {
      en: "<p>Source notes</p>",
      fr: "<p>Notes source</p>",
    },
  },
  source_keywords: ["water"],
  source_keywords_topic: ["climate"],
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
  source_data_attribution: "<p>Attribution <strong>text</strong></p>",
  source_citation: "<p>Citation text</p>",
  source_language_codes: [
    {
      code: "en",
    },
    {
      code: "fr",
    },
  ],
  source_contacts: [
    {
      name: "Alice Publisher",
      email: "alice@example.org",
      function: "Administrator",
      organisation_name: "UNEP",
      address: "Do not publish",
    },
  ],
  source_licenses: [
    {
      name: "CC BY",
      text: "<p>Creative Commons Attribution</p>",
    },
  ],
  source_homepage: {
    label: "FAO",
    url: "https://www.fao.org",
  },
  source_urls: [
    {
      label: "Download data",
      url: "https://example.org/data.zip",
    },
  ],
  source_annex_urls: [
    {
      label: "Methodology",
      url: "https://example.org/methodology.pdf",
    },
  ],
  source_bbox: {
    lng_min: 5,
    lat_min: 45,
    lng_max: 11,
    lat_max: 48,
  },
  source_start_at: 1577836800,
  source_end_at: 1609459200,
  source_released_at: 1262304000,
  source_modified_at: 1293840000,
  source_periodicity: "continual",
  source_is_timeless: false,
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
  source_keywords_topic: [],
  source_data_attribution: "",
  source_citation: "",
  source_language_codes: [],
  source_contacts: [],
  source_licenses: [],
  source_homepage: {},
  source_urls: [],
  source_annex_urls: [],
  source_periodicity: "",
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
    assert.deepEqual(record.properties.mapx, {
      view_id: "MX-ABC12-ABC12-ABC12",
      project_id: "MX-PROJECT",
      view_type: "vt",
      projects_id: ["MX-PROJECT"],
    });
    assert.equal("translations" in record.properties.mapx, false);
    assert.equal(record.links[2].rel, "alternate");
    assert.equal(record.links[2].title, "Open in MapX");
    assert.equal(record.links[2].href, "http://app.mapx.localhost:8880/?project=MX-PROJECT&viewsOpen=MX-ABC12-ABC12-ABC12&viewsListFilterActivated=true&zoomToViews=true");
    assert.equal(record.links[3].rel, "preview");
    assert.equal(record.links[3].title, "MapX static preview");
    assert.equal(record.links[3].href, "http://app.mapx.localhost:8880/static.html?views=MX-ABC12-ABC12-ABC12&zoomToViews=true");
    assert.equal(record.links.some((item) => item.rel === "tiles"), false);
  });

  it("normalizes MapX metadata into ISO-oriented catalogue groups", () => {
    const metadata = buildCatalogMetadata(row, {
      language: "fr",
    });

    assert.deepEqual(metadata.identification, {
      title: "Titre francais",
      abstract: "Resume francais",
      notes: "Notes source",
      attribution: "Attribution text",
      citation: "Citation text",
      languages: ["en", "fr"],
    });
    assert.deepEqual(metadata.contacts, [{
      name: "Alice Publisher",
      email: "alice@example.org",
      function: "Administrator",
      organization: "UNEP",
    }]);
    assert.deepEqual(metadata.keywords, {
      free: ["water"],
      gemet: [{
        id: 123,
        title: "eau",
      }],
      m49: [{
        id: "CHE",
        title: "Suisse",
      }],
      topic: ["climate"],
    });
    assert.deepEqual(metadata.temporal, {
      range: {
        start_at: "2020-01-01T00:00:00.000Z",
        end_at: "2021-01-01T00:00:00.000Z",
      },
      issued: "2010-01-01T00:00:00.000Z",
      modified: "2011-01-01T00:00:00.000Z",
      periodicity: "continual",
      is_timeless: false,
    });
    assert.deepEqual(metadata.constraints.licenses, [{
      name: "CC BY",
      text: "Creative Commons Attribution",
    }]);
    assert.deepEqual(metadata.distribution, {
      homepage: {
        label: "FAO",
        url: "https://www.fao.org",
      },
      source_urls: [{
        label: "Download data",
        url: "https://example.org/data.zip",
      }],
      annex_urls: [{
        label: "Methodology",
        url: "https://example.org/methodology.pdf",
      }],
    });
    assert.deepEqual(metadata.lineage, {
      statement: "Notes source",
    });
    assert.deepEqual(metadata.mapx, {
      view_id: "MX-ABC12-ABC12-ABC12",
      project_id: "MX-PROJECT",
      view_type: "vt",
      projects_id: ["MX-PROJECT"],
    });
  });

  it("prefers the estimated source extent for vector-table records", () => {
    const record = buildRecord({
      ...row,
      source_estimated_bbox: {
        lng_min: -17.6,
        lat_min: 1.4,
        lng_max: 24.0,
        lat_max: 37.1,
      },
      view_extent: {
        lng1: -20,
        lat1: 0,
        lng2: 25,
        lat2: 40,
      },
    });

    assert.deepEqual(record.bbox, [-17.6, 1.4, 24, 37.1]);
    assert.deepEqual(record.properties.metadata.extent.spatial.bbox, [
      -17.6,
      1.4,
      24,
      37.1,
    ]);
    assert.deepEqual(record.geometry.coordinates[0][0], [-17.6, 1.4]);
  });

  it("falls back to metadata when a vector source has no estimated extent", () => {
    const record = buildRecord({
      ...row,
      source_estimated_bbox: null,
      view_extent: {
        lng1: -20,
        lat1: 0,
        lng2: 25,
        lat2: 40,
      },
    });

    assert.deepEqual(record.bbox, [5, 45, 11, 48]);
  });

  it("does not use a cached view extent for vector-table records", () => {
    const record = buildRecord({
      ...row,
      source_estimated_bbox: null,
      source_bbox: {
        lng_min: 0,
        lat_min: 0,
        lng_max: 0,
        lat_max: 0,
      },
      view_extent: {
        lng1: -20,
        lat1: 0,
        lng2: 25,
        lat2: 40,
      },
    });

    assert.equal(record.bbox, undefined);
    assert.equal(record.geometry, null);
    assert.equal(record.properties.metadata.extent, undefined);
  });

  it("uses the precomputed view extent for non-table records with invalid metadata", () => {
    const record = buildRecord({
      ...row,
      view_type: "gj",
      source_bbox: {
        lng_min: 0,
        lat_min: 0,
        lng_max: 0,
        lat_max: 0,
      },
      view_extent: {
        lng1: -17.6,
        lat1: 1.4,
        lng2: 24.0,
        lat2: 37.1,
      },
    });

    assert.deepEqual(record.bbox, [-17.6, 1.4, 24, 37.1]);
    assert.deepEqual(record.properties.metadata.extent.spatial.bbox, [
      -17.6,
      1.4,
      24,
      37.1,
    ]);
    assert.deepEqual(record.geometry.coordinates[0][0], [-17.6, 1.4]);
  });

  it("adds GeoServer service links only for published GeoServer rows", () => {
    const record = buildRecord({
      ...row,
      is_geoserver_published: true,
    }, {
      baseUrl,
      collectionUrl,
      geoserverPublicUrl: "http://geoserver.mapx.localhost:8080/geoserver/",
      req,
    });
    const serviceLinks = record.links.filter((item) => item.rel === "service");

    assert.equal(serviceLinks.length, 2);
    assert.equal(serviceLinks[0].title, "WMS");
    assert.equal(serviceLinks[0].href, "http://geoserver.mapx.localhost:8080/geoserver/wms?service=WMS&version=1.3.0&request=GetCapabilities&layers=MX-PROJECT%3AMX-ABC12-ABC12-ABC12");
    assert.equal(serviceLinks[1].title, "WFS");
    assert.equal(serviceLinks[1].href, "http://geoserver.mapx.localhost:8080/geoserver/wfs?service=WFS&version=2.0.0&request=GetCapabilities&typeName=MX-PROJECT%3AMX-ABC12-ABC12-ABC12");
  });

  it("omits GeoServer service links for rows that are not published in GeoServer", () => {
    const record = buildRecord({
      ...row,
      is_geoserver_published: false,
    }, {
      baseUrl,
      collectionUrl,
      geoserverPublicUrl: "http://geoserver.mapx.localhost:8080/geoserver",
      req,
    });

    assert.equal(record.links.some((item) => item.rel === "service"), false);
  });

  it("omits GeoServer service links without a public GeoServer URL", () => {
    const record = buildRecord({
      ...row,
      is_geoserver_published: true,
    }, {
      baseUrl,
      collectionUrl,
      req,
    });

    assert.equal(record.links.some((item) => item.rel === "service"), false);
  });

  it("builds default-language pycsw records without duplicating identifiers per language", () => {
    const record = buildPycswRecord({
      ...row,
      is_geoserver_published: true,
    }, {
      language: "en",
      apiBaseUrl: baseUrl.replace("/ogc_meta", ""),
      geoserverPublicUrl: "http://geoserver.mapx.localhost:8880/geoserver",
    });
    const metadata = JSON.parse(record.metadata);
    const links = JSON.parse(record.links);

    assert.equal(record.identifier, row.view_id);
    assert.equal(record.typename, "pycsw:CoreMetadata");
    assert.equal(record.schema, "http://pycsw.org/metadata");
    assert.equal(record.language, "en");
    assert.equal(record.title, "English title");
    assert.equal(record.xml, record.metadata);
    assert.equal(metadata.properties.language, "en");
    assert.equal("translations" in metadata.properties.mapx, false);
    assert.equal(metadata.properties.metadata.identification.attribution, "Attribution text");
    assert.equal(metadata.properties.metadata.constraints.licenses[0].text, "Creative Commons Attribution");
    assert.equal(record.relation, `${collectionUrl}/items/${row.view_id}`);
    assert.equal(record.wkt_geometry, "POLYGON((5 45,11 45,11 48,5 48,5 45))");
    assert.equal(record.anytext.includes("Alice Publisher"), true);
    assert.equal(record.anytext.includes("Creative Commons Attribution"), true);
    assert.equal(record.anytext.includes("https://www.fao.org"), true);
    assert.equal(record.date_publication, "2010-01-01T00:00:00.000Z");
    assert.equal(record.date_revision, "2011-01-01T00:00:00.000Z");
    assert.equal(record.resourcelanguage, "en, fr");
    assert.equal(record.otherconstraints, "CC BY — Creative Commons Attribution");
    assert.equal(record.lineage, "Source notes");
    assert.equal(JSON.parse(record.contacts)[0].organization, "UNEP");
    assert.equal(JSON.parse(record.contacts)[0].role, "custodian");
    assert.equal(links.some((item) => item.name === "Open in MapX"), true);
    assert.equal(links.some((item) => item.name === "MapX vector tiles"), false);
    assert.equal(links.some((item) => item.protocol === "OGC:WMS"), true);
    assert.equal(links.some((item) => item.protocol === "OGC:WFS"), true);
  });

  it("keeps translated metadata available through the MapX-native OGC endpoint", () => {
    const record = buildRecord(row, {
      language: "fr",
      baseUrl,
      collectionUrl,
      req,
    });

    assert.equal(record.properties.language, "fr");
    assert.equal(record.properties.title, "Titre francais");
    assert.equal(record.properties.description, "Resume francais");
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
    const rows = [rowNoBbox, row];
    const snapshot = buildCatalogSnapshot(rows, {
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
    assert.deepEqual(rows.map((item) => item.view_id), [
      "MX-DEF34-DEF34-DEF34",
      "MX-ABC12-ABC12-ABC12",
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
      filterCatalogRows(rows, { q: "alice" }).map((item) => item.view_id),
      ["MX-ABC12-ABC12-ABC12"]
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
