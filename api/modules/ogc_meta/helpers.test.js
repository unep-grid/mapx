import fs from "node:fs";
import Ajv from "ajv";
import { describe, expect, it } from "vitest";
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
} from "./helpers.js";
import { buildPycswRecord } from "./pycsw_helpers.js";

const schemaPath = new URL("./fixtures/ogc_records/", import.meta.url);
const schemaFiles = [
  "landingPage.schema.json",
  "catalog.schema.json",
  "catalogs.schema.json",
  "recordGeoJSON.schema.json",
  "recordCollectionGeoJSON.schema.json",
];
const schemas = Object.fromEntries(
  schemaFiles.map((file) => [
    file,
    JSON.parse(fs.readFileSync(new URL(file, schemaPath), "utf8")),
  ]),
);
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

  expect(valid, JSON.stringify(validate.errors, null, 2)).toBe(true);
}

function getLandingFixture() {
  return {
    title: "MapX OGC API - Records",
    description:
      "Public MapX view and source metadata exposed as OGC API records.",
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
    expect(localize({ fr: "Bonjour", en: "Hello" }, "fr")).toBe("Bonjour");
    expect(localize({ en: "Hello" }, "de")).toBe("Hello");
    expect(localize("Plain", "fr")).toBe("Plain");
  });

  it("selects query language before Accept-Language", () => {
    expect(
      getLanguage({
        query: {
          lang: "fr",
        },
        headers: {
          "accept-language": "de-CH,de;q=0.9",
        },
      }),
    ).toBe("fr");
  });

  it("falls back to English for unsupported languages", () => {
    expect(
      getLanguage({
        query: {
          lang: "it",
        },
        headers: {},
      }),
    ).toBe("en");
  });

  it("parses valid bbox values", () => {
    expect(parseBbox("5,45,11,48")).toEqual([5, 45, 11, 48]);
  });

  it("rejects invalid bbox values", () => {
    expect(() => parseBbox("11,45,5,48")).toThrow(/Invalid bbox/);
  });

  it("parses datetime instants and intervals as epoch seconds", () => {
    expect(parseDatetime("2024-01-01")).toEqual({
      start: 1704067200,
      end: 1704067200,
    });
    expect(parseDatetime("2024-01-01/2024-01-02")).toEqual({
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

    expect(record.type).toBe("Feature");
    expect(record.id).toBe(row.view_id);
    expect(record.bbox).toEqual([5, 45, 11, 48]);
    expect(record.properties.title).toBe("Titre francais");
    expect(record.properties.description).toBe("Resume francais");
    expect(record.properties.themes[0].concepts[0].title).toBe("eau");
    expect(record.properties.mapx).toEqual({
      view_id: "MX-ABC12-ABC12-ABC12",
      project_id: "MX-PROJECT",
      view_type: "vt",
      projects_id: ["MX-PROJECT"],
    });
    expect("translations" in record.properties.mapx).toBe(false);
    expect(record.links[2].rel).toBe("alternate");
    expect(record.links[2].title).toBe("Open in MapX");
    expect(record.links[2].href).toBe(
      "http://app.mapx.localhost:8880/?project=MX-PROJECT&viewsOpen=MX-ABC12-ABC12-ABC12&viewsListFilterActivated=true&zoomToViews=true",
    );
    expect(record.links[3].rel).toBe("preview");
    expect(record.links[3].title).toBe("MapX static preview");
    expect(record.links[3].href).toBe(
      "http://app.mapx.localhost:8880/static.html?views=MX-ABC12-ABC12-ABC12&zoomToViews=true",
    );
    expect(record.links.some((item) => item.rel === "tiles")).toBe(false);
  });

  it("normalizes MapX metadata into ISO-oriented catalogue groups", () => {
    const metadata = buildCatalogMetadata(row, {
      language: "fr",
    });

    expect(metadata.identification).toEqual({
      title: "Titre francais",
      abstract: "Resume francais",
      notes: "Notes source",
      attribution: "Attribution text",
      citation: "Citation text",
      languages: ["en", "fr"],
    });
    expect(metadata.contacts).toEqual([
      {
        name: "Alice Publisher",
        email: "alice@example.org",
        function: "Administrator",
        organization: "UNEP",
      },
    ]);
    expect(metadata.keywords).toEqual({
      free: ["water"],
      gemet: [
        {
          id: 123,
          title: "eau",
        },
      ],
      m49: [
        {
          id: "CHE",
          title: "Suisse",
        },
      ],
      topic: ["climate"],
    });
    expect(metadata.temporal).toEqual({
      range: {
        start_at: "2020-01-01T00:00:00.000Z",
        end_at: "2021-01-01T00:00:00.000Z",
      },
      issued: "2010-01-01T00:00:00.000Z",
      modified: "2011-01-01T00:00:00.000Z",
      periodicity: "continual",
      is_timeless: false,
    });
    expect(metadata.constraints.licenses).toEqual([
      {
        name: "CC BY",
        text: "Creative Commons Attribution",
      },
    ]);
    expect(metadata.distribution).toEqual({
      homepage: {
        label: "FAO",
        url: "https://www.fao.org",
      },
      source_urls: [
        {
          label: "Download data",
          url: "https://example.org/data.zip",
        },
      ],
      annex_urls: [
        {
          label: "Methodology",
          url: "https://example.org/methodology.pdf",
        },
      ],
    });
    expect(metadata.lineage).toEqual({
      statement: "Notes source",
    });
    expect(metadata.mapx).toEqual({
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

    expect(record.bbox).toEqual([-17.6, 1.4, 24, 37.1]);
    expect(record.properties.metadata.extent.spatial.bbox).toEqual([
      -17.6, 1.4, 24, 37.1,
    ]);
    expect(record.geometry.coordinates[0][0]).toEqual([-17.6, 1.4]);
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

    expect(record.bbox).toEqual([5, 45, 11, 48]);
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

    expect(record.bbox).toBe(undefined);
    expect(record.geometry).toBe(null);
    expect(record.properties.metadata.extent).toBe(undefined);
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

    expect(record.bbox).toEqual([-17.6, 1.4, 24, 37.1]);
    expect(record.properties.metadata.extent.spatial.bbox).toEqual([
      -17.6, 1.4, 24, 37.1,
    ]);
    expect(record.geometry.coordinates[0][0]).toEqual([-17.6, 1.4]);
  });

  it("adds GeoServer service links only for published GeoServer rows", () => {
    const record = buildRecord(
      {
        ...row,
        is_geoserver_published: true,
      },
      {
        baseUrl,
        collectionUrl,
        geoserverPublicUrl: "http://geoserver.mapx.localhost:8080/geoserver/",
        req,
      },
    );
    const serviceLinks = record.links.filter((item) => item.rel === "service");

    expect(serviceLinks.length).toBe(2);
    expect(serviceLinks[0].title).toBe("WMS");
    expect(serviceLinks[0].href).toBe(
      "http://geoserver.mapx.localhost:8080/geoserver/wms?service=WMS&version=1.3.0&request=GetCapabilities&layers=MX-PROJECT%3AMX-ABC12-ABC12-ABC12",
    );
    expect(serviceLinks[1].title).toBe("WFS");
    expect(serviceLinks[1].href).toBe(
      "http://geoserver.mapx.localhost:8080/geoserver/wfs?service=WFS&version=2.0.0&request=GetCapabilities&typeName=MX-PROJECT%3AMX-ABC12-ABC12-ABC12",
    );
  });

  it("omits GeoServer service links for rows that are not published in GeoServer", () => {
    const record = buildRecord(
      {
        ...row,
        is_geoserver_published: false,
      },
      {
        baseUrl,
        collectionUrl,
        geoserverPublicUrl: "http://geoserver.mapx.localhost:8080/geoserver",
        req,
      },
    );

    expect(record.links.some((item) => item.rel === "service")).toBe(false);
  });

  it("omits GeoServer service links without a public GeoServer URL", () => {
    const record = buildRecord(
      {
        ...row,
        is_geoserver_published: true,
      },
      {
        baseUrl,
        collectionUrl,
        req,
      },
    );

    expect(record.links.some((item) => item.rel === "service")).toBe(false);
  });

  it("builds default-language pycsw records without duplicating identifiers per language", () => {
    const record = buildPycswRecord(
      {
        ...row,
        is_geoserver_published: true,
      },
      {
        language: "en",
        apiBaseUrl: baseUrl.replace("/ogc_meta", ""),
        geoserverPublicUrl: "http://geoserver.mapx.localhost:8880/geoserver",
      },
    );
    const metadata = JSON.parse(record.metadata);
    const links = JSON.parse(record.links);

    expect(record.identifier).toBe(row.view_id);
    expect(record.typename).toBe("pycsw:CoreMetadata");
    expect(record.schema).toBe("http://pycsw.org/metadata");
    expect(record.language).toBe("en");
    expect(record.title).toBe("English title");
    expect(record.xml).toBe(record.metadata);
    expect(metadata.properties.language).toBe("en");
    expect("translations" in metadata.properties.mapx).toBe(false);
    expect(metadata.properties.metadata.identification.attribution).toBe(
      "Attribution text",
    );
    expect(metadata.properties.metadata.constraints.licenses[0].text).toBe(
      "Creative Commons Attribution",
    );
    expect(record.relation).toBe(`${collectionUrl}/items/${row.view_id}`);
    expect(record.wkt_geometry).toBe("POLYGON((5 45,11 45,11 48,5 48,5 45))");
    expect(record.anytext.includes("Alice Publisher")).toBe(true);
    expect(record.anytext.includes("Creative Commons Attribution")).toBe(true);
    expect(record.anytext.includes("https://www.fao.org")).toBe(true);
    expect(record.date_publication).toBe("2010-01-01T00:00:00.000Z");
    expect(record.date_revision).toBe("2011-01-01T00:00:00.000Z");
    expect(record.resourcelanguage).toBe("en, fr");
    expect(record.otherconstraints).toBe(
      "CC BY — Creative Commons Attribution",
    );
    expect(record.lineage).toBe("Source notes");
    expect(JSON.parse(record.contacts)[0].organization).toBe("UNEP");
    expect(JSON.parse(record.contacts)[0].role).toBe("custodian");
    expect(links.some((item) => item.name === "Open in MapX")).toBe(true);
    expect(links.some((item) => item.name === "MapX vector tiles")).toBe(false);
    expect(links.some((item) => item.protocol === "OGC:WMS")).toBe(true);
    expect(links.some((item) => item.protocol === "OGC:WFS")).toBe(true);
  });

  it("keeps translated metadata available through the MapX-native OGC endpoint", () => {
    const record = buildRecord(row, {
      language: "fr",
      baseUrl,
      collectionUrl,
      req,
    });

    expect(record.properties.language).toBe("fr");
    expect(record.properties.title).toBe("Titre francais");
    expect(record.properties.description).toBe("Resume francais");
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
      features: [record],
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
      collections: [getCatalogFixture()],
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

    expect(snapshot.version).toBe(1);
    expect(snapshot.updated_at).toBe("2026-07-08T00:00:00.000Z");
    expect(snapshot.count).toBe(2);
    expect(snapshot.records.map((item) => item.view_id)).toEqual([
      "MX-ABC12-ABC12-ABC12",
      "MX-DEF34-DEF34-DEF34",
    ]);
    expect(rows.map((item) => item.view_id)).toEqual([
      "MX-DEF34-DEF34-DEF34",
      "MX-ABC12-ABC12-ABC12",
    ]);
  });

  it("filters cached catalog rows and keeps exact numberMatched possible", () => {
    const rows = [row, rowNoBbox];

    expect(
      filterCatalogRows(rows, { id: "MX-ABC12-ABC12-ABC12" }).map(
        (item) => item.view_id,
      ),
    ).toEqual(["MX-ABC12-ABC12-ABC12"]);
    expect(
      filterCatalogRows(rows, { q: "forest" }).map((item) => item.view_id),
    ).toEqual(["MX-DEF34-DEF34-DEF34"]);
    expect(
      filterCatalogRows(rows, { q: "alice" }).map((item) => item.view_id),
    ).toEqual(["MX-ABC12-ABC12-ABC12"]);
    expect(
      filterCatalogRows(rows, { bbox: [4, 44, 12, 49] }).map(
        (item) => item.view_id,
      ),
    ).toEqual(["MX-ABC12-ABC12-ABC12"]);
    expect(
      filterCatalogRows(rows, {
        datetime: { start: 1704067200, end: 1704067200 },
      }).map((item) => item.view_id),
    ).toEqual(["MX-ABC12-ABC12-ABC12"]);
  });

  it("pages cached catalog rows without changing total count", () => {
    const rows = [row, rowNoBbox];
    const page = pageRows(rows, {
      limit: 1,
      offset: 1,
    });

    expect(rows.length).toBe(2);
    expect(page.map((item) => item.view_id)).toEqual(["MX-DEF34-DEF34-DEF34"]);
  });
});
