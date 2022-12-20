import { clone } from "#mapx/helpers";
import { isView, isViewId, isProjectId } from "@fxi/mx_valid";
import { pgWrite } from "#mapx/db";
import { ioSendJobClient } from "#mapx/io";
import { getSourceSummary } from "#mapx/source";
import { standardDeviation } from "#mapx/stat";
import {
  getColumnsNames,
  getColumnsTypesSimple,
  tableExists,
  getTableDimension,
} from "#mapx/db-utils";
/**
 * View template.
 *
 */
const view_template_vt = {
  id: null,
  editor: null,
  date_modified: null,
  data: {
    title: { en: null },
    abstract: { en: null },
    attribute: { name: "gid", type: "string" },
    source: {
      type: "vector",
      layerInfo: {
        name: null,
        maskName: null,
      },
    },
  },
  type: "vt",
  project: null,
  readers: ["self"],
  editors: ["self"],
};

/**
 * Create view handler (io)
 * TODO : use proper templating + pg row escaping/conversion
 * @param {Socket} socket Io socket
 * @param {Object} config Config (uplaod handler)
 * @param {Object} view_options Overwrite view options
 * @return {Promise<boolean>}
 */
export async function ioAddViewVt(socket, config, view_options) {
  const client = await pgWrite.connect();
  let success;
  try {
    const session = socket.session;
    if (!session.user_roles.publisher) {
      return;
    }
    const view_base = clone(view_template_vt);
    const view = Object.assign({}, view_base, view_options);
    view.id = config.idView;
    view.editor = session.user_id;
    view.date_modified = new Date().toISOString();
    view.type = "vt";
    view.project = session.project_id;
    view.data.source.layerInfo.name = config.idSource;
    view.data.title[config.language || "en"] = config.title;
    view.data.abstract[config.language || "en"] = config.filename;

    /**
     * Test if layer exists and set default attribute
     */
    const exists = await tableExists(config.idSource);
    if (!exists) {
      throw new Error(`Missing layer ${config.idSource} `);
    }

    const attr = await getColumnsNames(config.idSource);
    const stats = await getSourceSummary({
      useCache: false,
      idSource: config.idSource,
      stats: ["geom"],
    });

    const ignore = ["gid", "geom", "_mx_valid"];
    const available = attr.filter((a) => !ignore.includes(a));

    if (attr.length === 0) {
      throw new Error(
        `No attribute usable for view in source ${config.idSource} `
      );
    }

    const dim = await getTableDimension(config.idSource);
    const table = await getColumnsTypesSimple(config.idSource, available);

    /**
     * Find a "good" first attribute
     * Priority :
     *  a) category with 3 - 10 distinct values
     *  b) any numeric type (number), assumed to be continous
     *  c) first category
     *  e.g.
     * < ┌─────────┬──────────────────┬────────────────────────────┬───────┐
     * < │ (index) │   column_name    │        column_type         │ score │
     * < ├─────────┼──────────────────┼────────────────────────────┼───────┤
     * < │    0    │     'mx_t1'      │         'integer'          │   5   │
     * < │    1    │     'mx_t0'      │         'integer'          │   5   │
     * < │    2    │ 'test_timestamp' │ 'timestamp with time zone' │   6   │
     * < │    3    │  'test_boolean'  │         'boolean'          │ 8.98  │
     * < │    4    │  'test_integer'  │         'integer'          │   5   │
     * < │    5    │  'test_numeric'  │     'double precision'     │   5   │
     * < │    6    │   'test_date'    │    'character varying'     │ 8.01  │
     * < │    7    │   'test_text'    │    'character varying'     │ 8.74  │
     * < └─────────┴──────────────────┴────────────────────────────┴───────┘
     */
    for (const row of table) {
      try {
        row.score = 0;

        const summary = await getSourceSummary({
          idSource: config.idSource,
          idAttr: row.column_name,
          stats: ["attributes"],
          binsMethod: "quantile",
          binsNumber: 5,
        });
        const isCategorical = summary.attribute_stat.type === "categorical";
        const isBoolean = row.column_type === "boolean";
        const stat = summary.attribute_stat;

        if (isCategorical) {
          if (!isBoolean) {
            row.score += 2;
          }
          // Distinct values ↗
          const nDistinct = stat.table.length;
          // Prop of values not null ↗
          const nGoodValues =
            (5 * stat.table_row_count) / stat.table_row_count_all;
          // Diversity ↗
          const diversity = 1 - nDistinct / dim.nrow;
          // But not extremely diverse ↗
          const notExtremDiversity = 2 * (nDistinct < dim.nrow);
          // Balanced number of classes ↗
          const inRangeClasses = 2 * (nDistinct >= 4 && nDistinct <= 12);
          // Score construction
          row.score +=
            inRangeClasses + nGoodValues + diversity + notExtremDiversity;
        } else {
          // Estimate how much each bins, based on quantiles, are different
          // the idea is to set a high score if the diff vary greatly
          // TODO: maybe create a test of Normality, Shapiro or such, to 
          // get an idaa of a normal distribution, in SQL directly.
          // here, things should go fast
          const dMax = Math.max(...stat.table.map((row) => row.diff));
          const dMin = Math.min(...stat.table.map((row) => row.diff));
          const dScore = (dMax - dMin) / dMax;
          if (isFinite(dScore)) {
            row.score += 2 * dScore;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    /**
     * Use the higher score
     */
    table.sort((a, b) => b.score - a.score);
    console.table(table);

    view.data.attribute.name = table[0].column_name;
    view.data.attribute.type = table[0].column_type;

    view.data.geometry = stats?.geom_type_table[0] || { type: "point" };

    /*
     * Validation.
     * TODO: isViewId is included in isView. Not yet available in api.
     * to be converted when @fxi/mx_valid is re-published
     */
    const valid =
      isViewId(view.id) && isView(view) && isProjectId(view.project);

    /**
     * Escape convert and save
     * - editor field can't be escaped (integer)
     * - json data, date, strings.. must be escaped
     * TODO: this could be automated / auto sanitized
     * - view  must be cloned, as original view is required in SendJob
     */
    const viewDb = clone(view);
    const e = client.escapeLiteral;
    viewDb.id = e(view.id);
    viewDb.editor = view.editor * 1;
    viewDb.type = e(view.type);
    viewDb.date_modified = e(view.date_modified);
    viewDb.project = e(view.project);
    viewDb.data = e(JSON.stringify(view.data));
    viewDb.readers = e(JSON.stringify(view.readers));
    viewDb.editors = e(JSON.stringify(view.editors));

    if (!valid) {
      throw new Error("Invalid view");
    }

    const keys = Object.keys(viewDb).join(",");
    const values = Object.values(viewDb).join(",");
    const sql = `INSERT INTO mx_views (${keys}) VALUES (${values})`;
    await client.query(sql);

    /**
     * Add view to the client
     */
    view._edit = true;
    await ioSendJobClient(socket, "view_add", {
      view: view,
    });
    success = true;
  } catch (e) {
    success = false;
    console.error(e);
  } finally {
    client.release();
  }
  return success;
}
