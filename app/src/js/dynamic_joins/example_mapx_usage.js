/**
 * Example usage of DynamicJoin with MapX integration
 *
 * This example shows how the new `useApiMapx` flag
 * simplifies dynamic joins with MapX backend integration.
 */

/**
 * BEFORE: Manual setup (from sample_dashboard.js)
 */
function oldApproach() {
  return {
    async onAdd(widget) {
      const { DynamicJoin, getApiUrl } = mx.helpers;

      // Manual URL construction
      const idSourceGeom = "mx_bw2pp_3mmcx_lwbtx_fzsqd_bjm0w";
      const tilesUrlBase = getApiUrl("getTile");
      const tilesUrl = [
        `${tilesUrlBase}?idSource=${idSourceGeom}`,
        `attributes=${"gid"},${"id"}`,
        `timestamp=${Date.now()}`,
      ].join("&");

      // Manual data fetching
      const urlTable = getApiUrl('getSourceTableAttribute');
      const dataResp = await fetch(`${urlTable}?id=mx_qo8fo_uw31u_3p86p_wc9at_jmnfa&attributes=gid_1,lc_type5,landcover,parameter,variable,aggregation,value,std`);
      const dataObj = await dataResp.json();
      const data = dataObj?.data;

      // Initialize with manual setup
      local.dj = new DynamicJoin(widget.map);
      await local.dj.init({
        idSourceGeom: idSourceGeom,
        sourceLayer: idSourceGeom,
        data: data,
        tilesUrl: [tilesUrl, tilesUrl],
        fieldJoinData: "gid_1",
        fieldJoinGeom: "gid",
        field: "value",
        // ... rest of config
      });
    }
  };
}

/**
 * AFTER: Simplified with MapX integration
 */
function newApproach() {
  const local = {
    dj: null,
    widget: null,
  };

  const { DynamicJoin, getViewLegend } = mx.helpers;

  return {
    async onAdd(widget) {
      const view = widget.view;
      local.widget = widget;

      // Create DynamicJoin instance
      local.dj = new DynamicJoin(widget.map);

      // Initialize with simplified MapX configuration
      await local.dj.init({
        // Enable MapX API integration (both data and tiles)
        useApiMapxData: true,
        useApiMapxTiles: true,

        // Required MapX-specific options
        idSourceData: "mx_qo8fo_uw31u_3p86p_wc9at_jmnfa",
        idSourceGeom: "mx_bw2pp_3mmcx_lwbtx_fzsqd_bjm0w",

        // Specify which fields to fetch (optional)
        fieldsData: ["gid_1", "lc_type5", "landcover", "parameter", "variable", "aggregation", "value", "std"],
        fieldsGeom: ["gid", "id"],

        // Join configuration
        fieldJoinData: "gid_1",
        fieldJoinGeom: "gid",
        field: "value",

        // UI containers
        elSelectContainer: widget.elContent,
        elLegendContainer: getViewLegend(view.id, { clone: false }),

        // Styling options (same as before)
        palette: "OrRd",
        stat: "quantile",
        classes: 5,
        colorNa: "#ccc",
        aggregateFn: "none",

        // Filters (same as before)
        staticFilters: [
          {
            field: "variable",
            operator: "==",
            value: "temp",
          },
        ],
        dynamicFilters: [
          {
            name: "scenario",
            type: "dropdown",
            default: "b",
          },
          {
            name: "team",
            type: "dropdown",
            default: "x",
          },
          {
            name: "year",
            type: "slider",
            single: true,
            integer: true,
          },
        ],

        // Event handlers (same as before)
        onTableAggregated: function (table) {
          console.log("aggregated", table);
        },
        onTableFiltered: function (table) {
          const w = widget.findWidget("graph");
          w?.setData(table);
          updateTimeSeries();
        },
        onTableReady: function (table, dj) {
          updateTimeSeries();
        },
        onMapClick: function (features, dj, event) {
          const gids = features.map((feature) => feature.properties.gid);
          updateTimeSeries(gids);
        },
      });
    },

    async onRemove(widget) {
      if (local?.dj?.destroy) {
        local.dj.destroy();
      }
    },

    async onData(widget, data) {
      // Handle external data updates if needed
    },
  };

  function updateTimeSeries(gids = null) {
    // Same implementation as in sample_dashboard.js
    const { dj, widget } = local;
    const data = dj.getTableBase();
    const { scenario, team } = dj.getCurrentFilters();

    // ... rest of the time series update logic
  }
}

/**
 * EDGE CASES: Mixed Data Sources
 */

// Case 1: MapX data + External tiles
function mapxDataExternalTiles() {
  return {
    async onAdd(widget) {
      const dj = new DynamicJoin(widget.map);
      await dj.init({
        // Only enable MapX data fetching
        useApiMapxData: true,
        useApiMapxTiles: false,

        // MapX data source
        idSourceData: "mx_data_source_id",
        fieldsData: ["field1", "field2"],

        // External tile source
        tilesUrl: ["https://external-tiles.com/{z}/{x}/{y}"],
        sourceLayer: "external_layer",

        // Join configuration
        fieldJoinData: "region_id",
        fieldJoinGeom: "id",
        field: "value"
      });
    }
  };
}

// Case 2: External data + MapX tiles
function externalDataMapxTiles() {
  return {
    async onAdd(widget) {
      const dj = new DynamicJoin(widget.map);
      await dj.init({
        // Only enable MapX tile URL construction
        useApiMapxData: false,
        useApiMapxTiles: true,

        // External data source
        dataUrl: "https://external-api.com/data.json",

        // MapX geometry source
        idSourceGeom: "mx_geom_source_id",
        fieldsGeom: ["gid", "name"],

        // Join configuration
        fieldJoinData: "region_id",
        fieldJoinGeom: "gid",
        field: "value"
      });
    }
  };
}

// Case 3: Both MapX (same as main example)
function bothMapx() {
  return {
    async onAdd(widget) {
      const dj = new DynamicJoin(widget.map);
      await dj.init({
        useApiMapxData: true,
        useApiMapxTiles: true,
        idSourceData: "mx_data_id",
        idSourceGeom: "mx_geom_id",
        // ... rest of config
      });
    }
  };
}

// Case 4: Neither MapX (traditional approach)
function neitherMapx() {
  return {
    async onAdd(widget) {
      const dj = new DynamicJoin(widget.map);
      await dj.init({
        // No MapX flags needed
        dataUrl: "https://external-api.com/data.json",
        tilesUrl: ["https://external-tiles.com/{z}/{x}/{y}"],
        sourceLayer: "external_layer",
        fieldJoinData: "region_id",
        fieldJoinGeom: "id",
        field: "value"
      });
    }
  };
}

/**
 * Key Benefits of the New Approach:
 *
 * 1. **Granular Control**: Separate flags for data and tiles
 * 2. **Mixed Sources**: Support for real-world edge cases
 * 3. **No Manual URLs**: Automatic URL construction when enabled
 * 4. **No Manual Fetching**: Automatic data fetching when enabled
 * 5. **Clean Configuration**: Only specify what you need
 * 6. **Backward Compatible**: Existing code continues to work
 * 7. **Same Power**: All original DynamicJoin features still available
 */

/**
 * Usage Comparison:
 *
 * BEFORE (manual):
 * - 15+ lines of URL construction and data fetching
 * - Error-prone manual parameter building
 * - Duplicate tile URL handling
 *
 * AFTER (with useApiMapx):
 * - 3 lines: useApiMapx: true + source IDs + field specs
 * - Automatic URL construction and data fetching
 * - Clean, declarative configuration
 */
