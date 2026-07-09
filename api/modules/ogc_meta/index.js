import { pgRead, redisGetJSON, redisSetJSON } from "#mapx/db";
import { sendError, sendJSON } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { settings } from "#root/settings";
import {
  buildCatalogSnapshot,
  buildRecord,
  filterCatalogRows,
  getLanguage,
  pageRows,
  parseBbox,
  parseDatetime,
} from "./helpers.js";
import { updatePycswCatalog } from "./pycsw.js";

const collectionId = "mapx";
const collectionTitle = "MapX public metadata";
const maxLimit = 100;
const defaultLimit = 10;
const rxViewId = /^MX-[A-Z0-9-]+$/;
const cacheKey = "ogc_meta:records:v1";
const cacheVersion = 1;
const ogcApiRecordsConformance = [
  "http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/core",
  "http://www.opengis.net/spec/ogcapi-records-1/1.0/conf/record-geojson",
];

const {
  validation_defaults: { languages },
} = settings;

export {
  mwLanding,
  mwConformance,
  mwCollections,
  mwCollection,
  mwItems,
  mwItem,
  updateOgcMetaCatalog,
};

async function mwLanding(req, res) {
  try {
    const baseUrl = getBaseUrl(req);
    sendJSON(res, {
      title: "MapX OGC API - Records",
      description: "Public MapX view and source metadata exposed as OGC API records.",
      links: [
        link("self", baseUrl, "application/json", "This document"),
        link("conformance", `${baseUrl}/conformance`, "application/json", "Conformance"),
        link("data", `${baseUrl}/collections`, "application/json", "Collections"),
      ],
    });
  } catch (err) {
    sendError(res, err);
  }
}

async function mwConformance(req, res) {
  try {
    sendJSON(res, {
      conformsTo: ogcApiRecordsConformance,
    });
  } catch (err) {
    sendError(res, err);
  }
}

async function mwCollections(req, res) {
  try {
    const baseUrl = getBaseUrl(req);
    sendJSON(res, {
      collections: [
        getCollection(baseUrl),
      ],
      links: [
        link("self", `${baseUrl}/collections`, "application/json", "Collections"),
        link("root", baseUrl, "application/json", "Landing page"),
      ],
    });
  } catch (err) {
    sendError(res, err);
  }
}

async function mwCollection(req, res) {
  try {
    assertCollection(req.params.collectionId);
    sendJSON(res, getCollection(getBaseUrl(req)));
  } catch (err) {
    sendError(res, err, err.statusCode || 500);
  }
}

async function mwItems(req, res) {
  try {
    assertCollection(req.params.collectionId);
    const language = getLanguage(req, languages);
    const paging = getPaging(req.query);
    const filter = getFilter(req.query);
    const baseUrl = getBaseUrl(req);
    const collectionUrl = `${baseUrl}/collections/${collectionId}`;
    const records = await getRecords({
      filter,
      paging,
    });
    const features = records.rows.map((row) =>
      buildRecord(row, {
        language,
        baseUrl,
        collectionUrl,
        languages,
        geoserverPublicUrl: getGeoServerPublicUrl(),
        req,
      })
    );

    sendJSON(res, {
      type: "FeatureCollection",
      timeStamp: new Date().toISOString(),
      numberMatched: records.total,
      numberReturned: features.length,
      features,
      links: getItemsLinks(req, records.total, paging),
    }, {
      contentType: "application/geo+json",
    });
  } catch (err) {
    sendError(res, err, err.statusCode || 500);
  }
}

async function mwItem(req, res) {
  try {
    assertCollection(req.params.collectionId);
    const language = getLanguage(req, languages);
    const baseUrl = getBaseUrl(req);
    const collectionUrl = `${baseUrl}/collections/${collectionId}`;
    const records = await getRecords({
      filter: {
        id: req.params.id,
      },
      paging: {
        limit: 1,
        offset: 0,
      },
    });

    if (records.rows.length === 0) {
      const err = new Error("Record not found");
      err.statusCode = 404;
      throw err;
    }

    sendJSON(res, buildRecord(records.rows[0], {
      language,
      baseUrl,
      collectionUrl,
      languages,
      geoserverPublicUrl: getGeoServerPublicUrl(),
      req,
    }), {
      contentType: "application/geo+json",
    });
  } catch (err) {
    sendError(res, err, err.statusCode || 500);
  }
}

async function getRecords({
  filter = {},
  paging = {},
}) {
  const viewId = filter.id?.toUpperCase();

  if (viewId && !rxViewId.test(viewId)) {
    const err = new Error("Invalid record id");
    err.statusCode = 400;
    throw err;
  }

  const catalog = await getOgcMetaCatalog();
  const rows = filterCatalogRows(catalog.records, {
    ...filter,
    id: viewId,
  });

  return {
    total: rows.length,
    rows: pageRows(rows, paging),
  };
}

function getCollection(baseUrl) {
  const collectionUrl = `${baseUrl}/collections/${collectionId}`;
  return {
    id: collectionId,
    type: "Collection",
    title: collectionTitle,
    description: "Public MapX view and source metadata records.",
    itemType: "record",
    links: [
      link("self", collectionUrl, "application/json", collectionTitle),
      link("items", `${collectionUrl}/items`, "application/geo+json", "Records"),
    ],
  };
}

function getItemsLinks(req, total, paging) {
  const links = [
    link("self", getRequestUrl(req), "application/geo+json", "This document"),
    link("collection", `${getBaseUrl(req)}/collections/${collectionId}`, "application/json", collectionTitle),
  ];

  if (paging.offset + paging.limit < total) {
    links.push(link("next", getPageUrl(req, paging.offset + paging.limit), "application/geo+json", "Next page"));
  }

  if (paging.offset > 0) {
    links.push(link("prev", getPageUrl(req, Math.max(0, paging.offset - paging.limit)), "application/geo+json", "Previous page"));
  }

  return links;
}

function getFilter(query) {
  return {
    q: getQueryString(query.q),
    bbox: parseBbox(query.bbox),
    datetime: parseDatetime(query.datetime),
  };
}

function getPaging(query) {
  return {
    limit: clampInteger(query.limit, defaultLimit, 1, maxLimit),
    offset: clampInteger(query.offset, 0, 0, Number.MAX_SAFE_INTEGER),
  };
}

function link(rel, href, type, title) {
  return {
    rel,
    type,
    title,
    href,
  };
}

function getBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}/ogc_meta`;
}

function getRequestUrl(req) {
  return `${req.protocol}://${req.get("host")}${req.originalUrl}`;
}

function getPageUrl(req, offset) {
  const url = new URL(getRequestUrl(req));
  url.searchParams.set("offset", offset);
  return url.toString();
}

function assertCollection(id) {
  if (id !== collectionId) {
    const err = new Error("Collection not found");
    err.statusCode = 404;
    throw err;
  }
}

function getQueryString(value) {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (typeof value !== "string") {
    return null;
  }

  value = value.trim();

  if (value.length === 0) {
    return null;
  }

  return value;
}

function clampInteger(value, defaultValue, min, max) {
  value = Number.parseInt(value, 10);

  if (!Number.isFinite(value)) {
    return defaultValue;
  }

  return Math.min(max, Math.max(min, value));
}

function getGeoServerPublicUrl() {
  return settings.geoserver_public?.url || settings.geoserver?.url_public || "";
}

async function updateOgcMetaCatalog() {
  const start = Date.now();
  const { rows } = await pgRead.query(templates.getViewsPublicForSearchIndex);
  const catalog = buildCatalogSnapshot(rows, {
    version: cacheVersion,
  });
  const pycsw = await updatePycswCatalog(catalog.records);

  await redisSetJSON(cacheKey, catalog);
  console.log(`Updated OGC metadata catalog (${catalog.count} records, ${pycsw.count} pycsw records) in ${Date.now() - start} ms`);

  return catalog;
}

async function getOgcMetaCatalog() {
  const catalog = await redisGetJSON(cacheKey);

  if (
    !catalog
    || catalog.version !== cacheVersion
    || !Array.isArray(catalog.records)
  ) {
    const err = new Error("OGC metadata catalog is not ready");
    err.statusCode = 503;
    throw err;
  }

  return catalog;
}
