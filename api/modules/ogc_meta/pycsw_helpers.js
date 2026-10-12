import { buildRecord } from "./helpers.js";

const pycswTypename = "pycsw:CoreMetadata";
const pycswSchema = "http://pycsw.org/metadata";
const pycswMetadataType = "application/geo+json";
const isoTopicCategories = new Set([
  "farming",
  "biota",
  "boundaries",
  "climatologyMeteorologyAtmosphere",
  "economy",
  "elevation",
  "environment",
  "geoscientificInformation",
  "health",
  "imageryBaseMapsEarthCover",
  "intelligenceMilitary",
  "inlandWaters",
  "location",
  "oceans",
  "planningCadastre",
  "society",
  "structure",
  "transportation",
  "utilitiesCommunication",
]);

/**
 * pycsw creates B-Tree indexes on its queryable text columns, and PostgreSQL
 * rejects B-Tree entries larger than 2704 bytes. Values injected into pycsw
 * are capped below that limit; MapX metadata and ogc_meta keep full values.
 */
const pycswIndexedTextMaxBytes = 2000;
// Full-record copies and the full-text source are not B-Tree indexed
const pycswUncappedColumns = new Set([
  "identifier",
  "xml",
  "metadata",
  "anytext",
]);
// JSON arrays parsed by pycsw: shortened by items to stay valid
const pycswJsonArrayColumns = new Set(["themes", "links", "contacts"]);
const pycswTruncatedMarker = " [truncated]";

export { buildPycswRecord };

function buildPycswRecord(
  row,
  {
    language = "en",
    languages,
    apiBaseUrl = "https://api.mapx.org",
    geoserverPublicUrl = "",
  } = {},
) {
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
  const catalogMetadata = properties.metadata || {};
  const temporal = catalogMetadata.temporal || {};
  const licenses = catalogMetadata.constraints?.licenses || [];
  const licenseText = licenses
    .map((license) => [license.name, license.text].filter(Boolean).join(" — "))
    .filter(Boolean)
    .join("; ");
  const contacts = getContacts(catalogMetadata.contacts);

  return fitPycswRecord({
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
    date: epochToIso(
      row.range_end_at || row.view_modified_at || row.view_created_at,
    ),
    date_modified: properties.updated,
    date_revision: temporal.modified || properties.updated,
    date_creation: properties.created,
    date_publication: temporal.issued || null,
    type: "dataset",
    wkt_geometry: bboxToWkt(record.bbox),
    crs: record.bbox ? "urn:ogc:def:crs:EPSG::4326" : null,
    time_begin: epochToIso(row.range_start_at),
    time_end: epochToIso(row.range_end_at),
    topicategory: (catalogMetadata.keywords?.topic || [])
      .filter((topic) => isoTopicCategories.has(topic))
      .join(", "),
    resourcelanguage:
      catalogMetadata.identification?.languages?.join(", ") || language,
    accessconstraints: licenseText ? "otherRestrictions" : null,
    otherconstraints: licenseText || null,
    conditionapplyingtoaccessanduse: licenseText || null,
    lineage: catalogMetadata.lineage?.statement || null,
    responsiblepartyrole: contacts
      .map((contact) => contact.role)
      .filter(Boolean)
      .join(", "),
    creator: getPartiesByRole(contacts, ["originator", "author"]),
    publisher: getPartiesByRole(contacts, ["publisher"]),
    contributor: getPartiesByRole(contacts, ["processor"]),
    organization:
      contacts
        .map((contact) => contact.organization)
        .filter(Boolean)
        .join(", ") || "MapX",
    links: JSON.stringify(links),
    contacts: JSON.stringify(contacts),
    relation: getMultilingualRecordUrl(collectionUrl, row.view_id),
  });
}

function fitPycswRecord(record) {
  for (const [column, value] of Object.entries(record)) {
    if (
      pycswUncappedColumns.has(column) ||
      typeof value !== "string" ||
      Buffer.byteLength(value) <= pycswIndexedTextMaxBytes
    ) {
      continue;
    }

    record[column] = pycswJsonArrayColumns.has(column)
      ? capJsonArray(value, pycswIndexedTextMaxBytes)
      : capText(value, pycswIndexedTextMaxBytes);
  }

  return record;
}

function capText(value, maxBytes) {
  const budget = maxBytes - Buffer.byteLength(pycswTruncatedMarker);
  let bytes = 0;
  let end = 0;

  for (const char of value) {
    bytes += Buffer.byteLength(char);
    if (bytes > budget) {
      break;
    }
    end += char.length;
  }

  const text = value.slice(0, end);
  const wordEnd = text.search(/\s+\S*$/);

  return `${wordEnd > 0 ? text.slice(0, wordEnd) : text}${pycswTruncatedMarker}`;
}

function capJsonArray(value, maxBytes) {
  const items = JSON.parse(value);

  if (!Array.isArray(items)) {
    return "[]";
  }

  while (items.length && Buffer.byteLength(JSON.stringify(items)) > maxBytes) {
    items.pop();
  }

  return JSON.stringify(items);
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
  ]
    .filter(Boolean)
    .join(" ");
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

function getContacts(sourceContacts = []) {
  const contacts = sourceContacts.map((contact) => ({
    name: contact.name || contact.organization,
    organization: contact.organization || contact.name,
    role: normalizeContactRole(contact.function),
    email: contact.email,
  }));

  contacts.push({
    name: "MapX",
    organization: "UNEP/GRID-Geneva",
    role: "publisher",
    email: "info@mapx.org",
  });

  return contacts;
}

function getPartiesByRole(contacts, roles) {
  return (
    contacts
      .filter((contact) => roles.includes(contact.role))
      .map((contact) => contact.organization || contact.name)
      .filter(Boolean)
      .join(", ") || null
  );
}

function normalizeContactRole(value) {
  const role = String(value || "")
    .trim()
    .toLowerCase();
  const roles = {
    administrator: "custodian",
    author: "originator",
    custodian: "custodian",
    distributor: "distributor",
    owner: "owner",
    pointofcontact: "pointOfContact",
    processor: "processor",
    publisher: "publisher",
    resourceprovider: "resourceProvider",
    user: "user",
  };

  return roles[role.replaceAll(/[^a-z]/g, "")] || "pointOfContact";
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
