import { htmlToText } from "html-to-text";

const defaultLanguages = {
  codes: ["fr", "en", "es", "ar", "ru", "zh", "de", "bn", "fa", "ps"],
  default: "en",
};

export {
  buildCatalogMetadata,
  buildRecord,
  buildCatalogSnapshot,
  filterCatalogRows,
  getLanguage,
  localize,
  pageRows,
  parseBbox,
  parseDatetime,
};

function buildCatalogSnapshot(rows, {
  updatedAt = new Date().toISOString(),
  version = 1,
} = {}) {
  const records = [...rows].sort((a, b) =>
    String(a.view_id || "").localeCompare(String(b.view_id || ""))
  );

  return {
    version,
    updated_at: updatedAt,
    count: records.length,
    records,
  };
}

function filterCatalogRows(rows, {
  id,
  q,
  bbox,
  datetime,
} = {}) {
  if (id) {
    rows = rows.filter((row) => row.view_id === id);
  }

  if (q) {
    const query = q.toLowerCase();
    rows = rows.filter((row) => getSearchText(row).includes(query));
  }

  if (bbox) {
    rows = rows.filter((row) => bboxIntersects(row, bbox));
  }

  if (datetime) {
    rows = rows.filter((row) => datetimeIntersects(row, datetime));
  }

  return rows;
}

function pageRows(rows, {
  limit,
  offset,
}) {
  return rows.slice(offset, offset + limit);
}

function buildRecord(row, {
  language = defaultLanguages.default,
  languages = defaultLanguages,
  baseUrl = "",
  collectionUrl = "",
  geoserverPublicUrl = "",
  req = null,
} = {}) {
  const title = localize(row.meta_multilingual?.view_title, language, languages);
  const description = cleanText(
    localize(row.meta_multilingual?.view_abstract, language, languages)
      || localize(row.meta_multilingual?.source_abstract, language, languages)
  );
  const bbox = getRowBbox(row);
  const metadata = buildCatalogMetadata(row, {
    language,
    languages,
  });
  const itemUrl = `${collectionUrl}/items/${row.view_id}`;
  const properties = {
    type: "dataset",
    title,
    description,
    language,
    languages: languages.codes,
    created: epochToIso(row.view_created_at),
    updated: epochToIso(row.view_modified_at),
    keywords: row.source_keywords || [],
    themes: getThemes(row, language, languages),
    metadata,
    mapx: {
      view_id: row.view_id,
      project_id: row.project_id,
      view_type: row.view_type,
      projects_id: row.projects_id || [],
    },
  };

  if (row.range_start_at || row.range_end_at) {
    properties.datetime = getInterval(row.range_start_at, row.range_end_at);
  }

  return {
    type: "Feature",
    id: row.view_id,
    geometry: bboxToGeometry(bbox),
    bbox: bbox || undefined,
    properties,
    links: getRecordLinks({
      row,
      itemUrl,
      baseUrl,
      req,
      geoserverPublicUrl,
    }),
  };
}

function buildCatalogMetadata(row, {
  language = defaultLanguages.default,
  languages = defaultLanguages,
} = {}) {
  const title = localize(row.meta_multilingual?.view_title, language, languages);
  const abstract = cleanText(
    localize(row.meta_multilingual?.view_abstract, language, languages)
      || localize(row.meta_multilingual?.source_abstract, language, languages)
  );
  const notes = cleanText(
    localize(row.meta_multilingual?.source_notes, language, languages)
  );
  const bbox = getRowBbox(row);

  return removeEmpty({
    identification: {
      title,
      abstract,
      notes,
      attribution: cleanText(row.source_data_attribution),
      citation: cleanText(row.source_citation),
      languages: normalizeLanguageCodes(row.source_language_codes),
    },
    contacts: normalizeContacts(row.source_contacts),
    keywords: {
      free: normalizeTextArray(row.source_keywords),
      gemet: (row.source_keywords_gemet_multilingual || []).map((item) => removeEmpty({
        id: item.id,
        title: localize(item, language, languages),
      })),
      m49: (row.source_keywords_m49_multilingual || []).map((item) => removeEmpty({
        id: item.id,
        title: localize(item, language, languages),
      })),
      topic: normalizeTextArray(row.source_keywords_topic),
    },
    extent: {
      spatial: {
        bbox,
      },
    },
    temporal: {
      range: {
        start_at: epochToIso(row.source_start_at),
        end_at: epochToIso(row.source_end_at),
      },
      issued: epochToIso(row.source_released_at),
      modified: epochToIso(row.source_modified_at),
      periodicity: cleanText(row.source_periodicity),
      is_timeless: normalizeBoolean(row.source_is_timeless),
    },
    constraints: {
      licenses: normalizeLicenses(row.source_licenses),
    },
    distribution: {
      homepage: normalizeUrlItem(row.source_homepage),
      source_urls: normalizeUrlItems(row.source_urls),
      annex_urls: normalizeUrlItems(row.source_annex_urls),
    },
    lineage: {
      statement: notes,
    },
    mapx: {
      view_id: row.view_id,
      project_id: row.project_id,
      view_type: row.view_type,
      projects_id: row.projects_id || [],
    },
  });
}

function getRecordLinks({
  row,
  itemUrl,
  baseUrl,
  req,
  geoserverPublicUrl,
}) {
  const links = [
    link("self", itemUrl, "application/geo+json", "This record"),
    link("collection", `${baseUrl}/collections/mapx`, "application/json", "MapX public metadata"),
    link("alternate", getAppViewUrl(req, row), "text/html", "Open in MapX"),
    link("preview", getStaticViewUrl(req, row.view_id), "text/html", "MapX static preview"),
  ];
  const serviceLinks = getGeoServerLinks(row, geoserverPublicUrl);

  return links.concat(serviceLinks);
}

function getGeoServerLinks(row, publicUrl) {
  if (
    !publicUrl
    || row.is_geoserver_published !== true
    || !row.project_id
    || !row.view_id
  ) {
    return [];
  }

  const layer = `${row.project_id}:${row.view_id}`;
  return [
    link("service", getGeoServerServiceUrl(publicUrl, "wms", {
      service: "WMS",
      version: "1.3.0",
      request: "GetCapabilities",
      layers: layer,
    }), "application/xml", "WMS"),
    link("service", getGeoServerServiceUrl(publicUrl, "wfs", {
      service: "WFS",
      version: "2.0.0",
      request: "GetCapabilities",
      typeName: layer,
    }), "application/xml", "WFS"),
  ];
}

function getGeoServerServiceUrl(base, service, params) {
  const url = new URL(`${base.replace(/\/$/, "")}/${service}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function getLanguage(req, languages = defaultLanguages) {
  const queryLanguage = getQueryString(req.query.lang);
  const headerLanguage = getQueryString(req.headers["accept-language"])
    ?.split(",")[0]
    ?.split("-")[0];
  const language = queryLanguage || headerLanguage || languages.default;

  if (languages.codes.includes(language)) {
    return language;
  }

  return languages.default;
}

function localize(value, language = defaultLanguages.default, languages = defaultLanguages) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value[language] || value[languages.default] || "";
}

function cleanText(value) {
  if (!value) {
    return "";
  }

  if (typeof value !== "string") {
    return "";
  }

  return htmlToText(value, {
    wordwrap: false,
  });
}

function normalizeContacts(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => removeEmpty({
    name: cleanText(item?.name),
    email: cleanText(item?.email),
    function: cleanText(item?.function),
    organization: cleanText(item?.organisation_name),
  }));
}

function normalizeLicenses(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => removeEmpty({
    name: cleanText(item?.name),
    text: cleanText(item?.text),
  }));
}

function normalizeUrlItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(normalizeUrlItem);
}

function normalizeUrlItem(item) {
  if (!item) {
    return null;
  }

  return removeEmpty({
    label: cleanText(item.label),
    url: cleanText(item.url),
  });
}

function normalizeTextArray(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map(cleanText).filter(Boolean);
}

function normalizeLanguageCodes(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === "string") {
        return cleanText(item);
      }

      return cleanText(item?.code);
    })
    .filter(Boolean);
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return null;
}

function removeEmpty(value) {
  if (Array.isArray(value)) {
    const items = value.map(removeEmpty).filter((item) => !isEmptyValue(item));
    return items.length > 0 ? items : undefined;
  }

  if (value && typeof value === "object") {
    const out = {};

    for (const [key, item] of Object.entries(value)) {
      const clean = removeEmpty(item);

      if (!isEmptyValue(clean)) {
        out[key] = clean;
      }
    }

    return Object.keys(out).length > 0 ? out : undefined;
  }

  return value;
}

function isEmptyValue(value) {
  return (
    value === undefined
    || value === null
    || value === ""
    || (Array.isArray(value) && value.length === 0)
    || (
      value
      && typeof value === "object"
      && !Array.isArray(value)
      && Object.keys(value).length === 0
    )
  );
}

function getThemes(row, language, languages) {
  const themes = [];
  const gemet = (row.source_keywords_gemet_multilingual || []).map((item) => ({
    id: item.id,
    title: localize(item, language, languages),
  }));
  const m49 = (row.source_keywords_m49_multilingual || []).map((item) => ({
    id: item.id,
    title: localize(item, language, languages),
  }));

  if (gemet.length > 0) {
    themes.push({
      scheme: "GEMET",
      concepts: gemet,
    });
  }

  if (m49.length > 0) {
    themes.push({
      scheme: "M49",
      concepts: m49,
    });
  }

  return themes;
}

function parseBbox(value) {
  const bbox = getQueryString(value);

  if (!bbox) {
    return null;
  }

  const items = bbox.split(",").map((item) => Number(item));

  if (
    items.length !== 4
    || items.some((item) => !Number.isFinite(item))
    || items[0] >= items[2]
    || items[1] >= items[3]
  ) {
    const err = new Error("Invalid bbox. Expected west,south,east,north.");
    err.statusCode = 400;
    throw err;
  }

  return items;
}

function parseDatetime(value) {
  const datetime = getQueryString(value);

  if (!datetime) {
    return null;
  }

  const parts = datetime.split("/");

  if (parts.length === 1) {
    const instant = parseDateEpoch(parts[0]);
    return {
      start: instant,
      end: instant,
    };
  }

  if (parts.length !== 2) {
    throwInvalidDatetime();
  }

  return {
    start: parts[0] === ".." ? 0 : parseDateEpoch(parts[0]),
    end: parts[1] === ".." ? 4102444800 : parseDateEpoch(parts[1]),
  };
}

function getSearchText(row) {
  return [
    row.view_id,
    row.project_id,
    JSON.stringify(row.meta_multilingual || {}),
    JSON.stringify(row.source_keywords || []),
    JSON.stringify(row.source_keywords_m49 || []),
    JSON.stringify(row.source_keywords_gemet || []),
    JSON.stringify(row.source_keywords_topic || []),
    JSON.stringify(row.source_keywords_m49_multilingual || []),
    JSON.stringify(row.source_keywords_gemet_multilingual || []),
    row.source_data_attribution,
    row.source_citation,
    JSON.stringify(row.source_language_codes || []),
    JSON.stringify(row.source_contacts || []),
    JSON.stringify(row.source_licenses || []),
    JSON.stringify(row.source_homepage || {}),
    JSON.stringify(row.source_urls || []),
    JSON.stringify(row.source_annex_urls || []),
    row.source_periodicity,
    JSON.stringify(row.projects_id || []),
    JSON.stringify(row.projects_title_multilingual || []),
  ].join(" ").toLowerCase();
}

function bboxIntersects(row, bbox) {
  const recordBbox = getRowBbox(row);

  if (!recordBbox) {
    return false;
  }

  const [recordWest, recordSouth, recordEast, recordNorth] = recordBbox;
  const [west, south, east, north] = bbox;

  return (
    recordWest <= east
    && recordEast >= west
    && recordSouth <= north
    && recordNorth >= south
  );
}

function datetimeIntersects(row, datetime) {
  const start = Number(row.range_start_at);
  const end = Number(row.range_end_at);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return false;
  }

  return end >= datetime.start && start <= datetime.end;
}

function parseDateEpoch(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throwInvalidDatetime();
  }

  return Math.floor(date.getTime() / 1000);
}

function throwInvalidDatetime() {
  const err = new Error("Invalid datetime. Expected ISO date/time or start/end interval.");
  err.statusCode = 400;
  throw err;
}

function normalizeBbox(value) {
  if (!value) {
    return null;
  }

  const west = Number(value.lng_min ?? value.lng1);
  const south = Number(value.lat_min ?? value.lat1);
  const east = Number(value.lng_max ?? value.lng2);
  const north = Number(value.lat_max ?? value.lat2);

  if (
    !Number.isFinite(west)
    || !Number.isFinite(south)
    || !Number.isFinite(east)
    || !Number.isFinite(north)
    || west < -180
    || east > 180
    || south < -90
    || north > 90
    || west >= east
    || south >= north
  ) {
    return null;
  }

  return [west, south, east, north];
}

function getRowBbox(row) {
  const metadataBbox = normalizeBbox(row.source_bbox);

  if (row.view_type === "vt") {
    return normalizeBbox(row.source_estimated_bbox) || metadataBbox;
  }

  return metadataBbox || normalizeBbox(row.view_extent);
}

function bboxToGeometry(bbox) {
  if (!bbox) {
    return null;
  }

  const [west, south, east, north] = bbox;

  return {
    type: "Polygon",
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ]],
  };
}

function epochToIso(value) {
  if (!value) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

function getInterval(start, end) {
  const startIso = epochToIso(start) || "..";
  const endIso = epochToIso(end) || "..";

  return `${startIso}/${endIso}`;
}

function link(rel, href, type, title) {
  return {
    rel,
    type,
    title,
    href,
  };
}

function getAppBaseUrl(req) {
  const host = req?.get("host") || "api.mapx.org";
  const appHost = host
    .replace(/^api\./, "app.")
    .replace(/^apidev\./, "dev.");
  return `${req?.protocol || "https"}://${appHost}`;
}

function getAppViewUrl(req, row) {
  const url = new URL(`${getAppBaseUrl(req)}/`);

  if (row.project_id) {
    url.searchParams.set("project", row.project_id);
  }

  url.searchParams.set("viewsOpen", row.view_id);
  url.searchParams.set("viewsListFilterActivated", "true");
  url.searchParams.set("zoomToViews", "true");

  return url.toString();
}

function getStaticViewUrl(req, idView) {
  const url = new URL(`${getAppBaseUrl(req)}/static.html`);

  url.searchParams.set("views", idView);
  url.searchParams.set("zoomToViews", "true");
  return url.toString();
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
