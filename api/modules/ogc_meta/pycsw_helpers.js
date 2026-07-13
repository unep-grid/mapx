import { buildRecord } from "./helpers.js";

const pycswTypename = "pycsw:CoreMetadata";
const pycswSchema = "http://pycsw.org/metadata";
const pycswMetadataType = "application/geo+json";

export {
  buildPycswRecord,
};

function buildPycswRecord(row, {
  language = "en",
  languages,
  apiBaseUrl = "https://api.mapx.org",
  geoserverPublicUrl = "",
} = {}) {
  const collectionUrl = `${apiBaseUrl}/ogc_meta/collections/mapx`;
  const record = buildRecord(row, {
    language,
    languages,
    baseUrl: `${apiBaseUrl}/ogc_meta`,
    collectionUrl,
    geoserverPublicUrl,
    req: getPublicRequest(apiBaseUrl),
  });
  const properties = record.properties;
  const keywords = properties.keywords || [];
  const links = getPycswLinks(record.links);
  const metadata = JSON.stringify(record);

  return {
    identifier: row.view_id,
    typename: pycswTypename,
    schema: pycswSchema,
    mdsource: "local",
    insert_date: new Date().toISOString(),
    xml: metadata,
    metadata,
    metadata_type: pycswMetadataType,
    anytext: getAnyText(record),
    language,
    title: properties.title || row.view_id,
    abstract: properties.description || "",
    keywords: keywords.join(", "),
    keywordstype: "theme",
    themes: JSON.stringify(properties.themes || []),
    format: "application/geo+json",
    source: row.view_id,
    date: epochToIso(row.range_end_at || row.view_modified_at || row.view_created_at),
    date_modified: properties.updated,
    date_creation: properties.created,
    type: "dataset",
    wkt_geometry: bboxToWkt(record.bbox),
    crs: record.bbox ? "urn:ogc:def:crs:EPSG::4326" : null,
    time_begin: epochToIso(row.range_start_at),
    time_end: epochToIso(row.range_end_at),
    organization: "MapX",
    links: JSON.stringify(links),
    contacts: JSON.stringify(getContacts()),
    relation: getMultilingualRecordUrl(collectionUrl, row.view_id),
  };
}

function getPycswLinks(links) {
  return links.map((item) => ({
    name: item.title,
    description: item.title,
    protocol: getPycswProtocol(item),
    url: item.href,
  }));
}

function getPycswProtocol(link) {
  if (link.title === "WMS") {
    return "OGC:WMS";
  }

  if (link.title === "WFS") {
    return "OGC:WFS";
  }

  return "WWW:LINK-1.0-http--link";
}

function getAnyText(record) {
  const properties = record.properties;
  const themes = properties.themes || [];
  const themeText = themes
    .flatMap((theme) => theme.concepts || [])
    .map((concept) => concept.title)
    .filter(Boolean);

  return [
    record.id,
    properties.title,
    properties.description,
    properties.language,
    ...(properties.keywords || []),
    ...themeText,
    ...flattenText(properties.metadata),
    properties.mapx?.project_id,
    ...(properties.mapx?.projects_id || []),
  ].filter(Boolean).join(" ");
}

function flattenText(value) {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenText);
  }

  if (typeof value === "object") {
    return Object.values(value).flatMap(flattenText);
  }

  return [];
}

function getContacts() {
  return [{
    name: "MapX",
    organization: "UNEP/GRID-Geneva",
    role: "publisher",
  }];
}

function getPublicRequest(apiBaseUrl) {
  const url = new URL(apiBaseUrl);

  return {
    protocol: url.protocol.replace(":", ""),
    get(key) {
      return key === "host" ? url.host : "";
    },
  };
}

function getMultilingualRecordUrl(collectionUrl, id) {
  return `${collectionUrl}/items/${id}`;
}

function bboxToWkt(bbox) {
  if (!bbox) {
    return null;
  }

  const [west, south, east, north] = bbox;

  return `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`;
}

function epochToIso(value) {
  if (!value) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}
