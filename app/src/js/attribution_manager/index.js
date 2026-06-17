import {
  getViewMetaToHtml,
  getViewMetadata,
  getViewSourceMetadata,
} from "../metadata/utils.js";

const LAYER_ATTRIBUTION_KEYS = ["attribution", "mapx:attribution"];
const MAPX_ATTRIBUTION = "© UNEP/GRID MapX";

class AttributionManager {
  constructor(map, options = {}) {
    this.map = map;
    this.idViews = options.idViews || [];
    this.template = options.template;
  }

  rows(options = {}) {
    return dedupeRows(this.getStyleRows(options));
  }

  async getRows(options = {}) {
    const rows = [
      ...this.getStyleRows(options),
      ...(await this.getMetadataRows()),
    ];
    return dedupeRows(rows);
  }

  async markdown(options = {}) {
    return formatMarkdown(await this.getRows(options));
  }

  async json(options = {}) {
    return JSON.stringify(await this.getRows(options), null, 2);
  }

  async templateMarkdown() {
    if (this.template) {
      return this.template;
    }
    const { default: template } = await import("./attribution.md");
    return template;
  }

  async getMetaFiles() {
    return Promise.all(
      this.idViews.map(async (id) => ({
        type: "file",
        content: await getViewMetaToHtml(id),
        name: `view_metadata_${id}.html`,
      })),
    );
  }

  async getAttributionFiles(options = {}) {
    const rows = await this.getRows(options);
    return [
      {
        type: "file",
        content: await this.templateMarkdown(),
        name: "attribution.md",
      },
      {
        type: "file",
        content: formatMarkdown(rows),
        name: "map_attributions.md",
      },
      {
        type: "file",
        content: JSON.stringify(rows, null, 2),
        name: "map_attributions.json",
      },
    ];
  }

  async getFiles(options = {}) {
    return [
      ...(await this.getMetaFiles()),
      ...(await this.getAttributionFiles(options)),
    ];
  }

  getStyleRows(options = {}) {
    const map = options.map || this.map;
    const style = map?.getStyle?.() || {};
    const rows = [
      buildStyleRow({
        kind: "source",
        id: "mapx",
        type: "application",
        attribution: MAPX_ATTRIBUTION,
      }),
    ];

    for (const [id, source] of Object.entries(style.sources || {})) {
      if (source?.attribution) {
        rows.push(
          buildStyleRow({
            kind: "source",
            id,
            type: source.type,
            attribution: source.attribution,
          }),
        );
      }
    }

    for (const layer of style.layers || []) {
      const attribution = getLayerAttribution(layer);
      if (attribution) {
        rows.push(
          buildStyleRow({
            kind: "layer",
            id: layer.id,
            type: layer.type,
            source: layer.source,
            attribution,
          }),
        );
      }
    }

    return rows;
  }

  async getMetadataRows() {
    const rows = [];

    for (const idView of this.idViews) {
      const viewMeta = await getViewMetadata(idView);
      const viewRow = buildMetadataRow({
        kind: "view_metadata",
        id: idView,
        type: "view",
        meta: viewMeta,
      });
      if (viewRow) {
        rows.push(viewRow);
      }

      const sourceMeta = await getViewSourceMetadata(idView);
      for (const meta of sourceMeta || []) {
        const sourceRow = buildMetadataRow({
          kind: "source_metadata",
          id: getPath(meta, "_id_source", idView),
          type: "source",
          view: idView,
          meta,
        });
        if (sourceRow) {
          rows.push(sourceRow);
        }
      }
    }

    return rows;
  }
}

function formatMarkdown(rows) {
  const attributions = getMarkdownAttributions(rows);
  const lines = ["# Map Attribution", ""];

  if (attributions.length === 0) {
    lines.push("No map attributions were found.");
  } else {
    for (const attribution of attributions) {
      lines.push(`- ${escapeMarkdown(attribution)}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function getMarkdownAttributions(rows) {
  const seen = new Set();
  const out = [];

  for (const row of rows) {
    const attribution = getRowAttributionText(row);
    if (!attribution) {
      continue;
    }
    const key = normalizeAttribution(attribution);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(attribution);
  }

  return out;
}

function getRowAttributionText(row) {
  return cleanText(row.attribution_text || row.attribution_html);
}

function getLayerAttribution(layer) {
  const metadata = layer?.metadata || {};
  for (const key of LAYER_ATTRIBUTION_KEYS) {
    if (metadata[key]) {
      return metadata[key];
    }
  }
}

function buildStyleRow(opt) {
  const attribution = `${opt.attribution}`;
  const row = {
    kind: opt.kind,
    id: opt.id,
    type: opt.type,
    attribution_html: attribution,
    attribution_text: htmlToText(attribution),
  };

  if (opt.source) {
    row.source = opt.source;
  }

  return row;
}

function buildMetadataRow(opt) {
  const meta = opt.meta || {};
  const row = {
    kind: opt.kind,
    id: opt.id,
    type: opt.type,
    title: getLocalized(getPath(meta, "text.title")),
    data_attribution: cleanText(getPath(meta, "text.data_attribution")),
    citation: cleanText(getPath(meta, "text.citation")),
    licenses: getLicenses(meta),
    homepage: getUrlItem(getPath(meta, "origin.homepage")),
    source_urls: getUrlItems(getPath(meta, "origin.source.urls", [])),
    annex_urls: getUrlItems(getPath(meta, "annex.references", [])),
  };

  if (opt.view) {
    row.view = opt.view;
  }

  row.attribution_text = row.data_attribution || row.citation || "";
  row.attribution_html = row.attribution_text;

  if (!hasMetadataAttribution(row)) {
    return;
  }

  return removeEmpty(row);
}

function getLicenses(meta) {
  const licenses = getPath(meta, "license.licenses", []);
  if (!Array.isArray(licenses)) {
    return [];
  }
  return licenses
    .map((license) =>
      removeEmpty({
        name: cleanText(license?.name),
        text: cleanText(license?.text),
      }),
    )
    .filter((license) => Object.keys(license).length > 0);
}

function getUrlItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map(getUrlItem).filter(Boolean);
}

function getUrlItem(item) {
  if (!item) {
    return;
  }
  const url = cleanText(item.url);
  const label = cleanText(item.label);
  if (!url && !label) {
    return;
  }
  return removeEmpty({ label, url });
}

function hasMetadataAttribution(row) {
  return !!(
    row.data_attribution ||
    row.citation ||
    row.licenses.length ||
    row.homepage ||
    row.source_urls.length ||
    row.annex_urls.length
  );
}

function dedupeRows(rows) {
  const seen = new Set();
  const out = [];

  for (const row of rows) {
    const key = getRowDedupeKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(row);
  }

  return out;
}

function getRowDedupeKey(row) {
  const value =
    row.attribution_text ||
    row.attribution_html ||
    row.data_attribution ||
    row.citation ||
    row.title ||
    row.id;
  return normalizeAttribution(value);
}

function htmlToText(html) {
  const value = `${html}`;
  if (typeof document === "undefined") {
    return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }

  const el = document.createElement("div");
  el.innerHTML = value;
  return el.textContent.replace(/\s+/g, " ").trim();
}

function cleanText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return htmlToText(value).replace(/\s+/g, " ").trim();
}

function getLocalized(value) {
  if (typeof value === "string") {
    return cleanText(value);
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  return cleanText(value.en || Object.values(value).find(Boolean) || "");
}

function normalizeAttribution(value) {
  return `${value}`.replace(/\s+/g, " ").trim();
}

function escapeMarkdown(value) {
  return `${value}`.replace(/([\\[\]])/g, "\\$1");
}

function removeEmpty(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== "" && value !== null && value !== undefined;
    }),
  );
}

function getPath(obj, path, fallback = "") {
  const parts = path.split(".");
  let value = obj;
  for (const part of parts) {
    value = value?.[part];
    if (value === undefined || value === null) {
      return fallback;
    }
  }
  return value;
}

export { AttributionManager };
