import { BaseTimeMapLegend } from "../shared/base_time_map_legend.js";
import { isNotEmpty } from "../../is_test";
import { DateTime, Duration, Interval } from "luxon";
import "./style.less";

/**
 * Generic WMS implementation for time-enabled map legends
 * Extends BaseTimeMapLegend with WMS-specific functionality
 */
export class WMSTimeMapLegend extends BaseTimeMapLegend {
  constructor(options) {
    super(options);
  }

  // Override container class for WMS-specific styling
  getContainerClass() {
    return "wms_extension";
  }

  // Implement abstract method for URL construction
  constructUrl(selectedDate, selectedElevation, selectedStyle) {
    return this.constructWmsUrl(selectedDate, selectedElevation, selectedStyle);
  }

  // Implement abstract method for capabilities URL
  constructGetCapabilitiesUrl() {
    return this.constructWmsGetCapabilitiesUrl();
  }

  // Implement abstract method for legend URL
  getLegendUrl() {
    const styles = this.getLayerInfo("styles");
    const currentStyle = styles?.find((s) => s.name === this._opt.style);
    return currentStyle?.url_legend;
  }

  constructWmsUrl(selectedDate, selectedElevation, selectedStyle) {
    const { baseURL, layerName, dpr } = this._opt;

    const paramObject = {
      SERVICE: "WMS",
      VERSION: "1.3.0",
      REQUEST: "GetMap",
      LAYERS: layerName,
      STYLES: selectedStyle || "",
      CRS: "EPSG:3857",
      FORMAT: "image/png",
      TRANSPARENT: "true",
      WIDTH: dpr > 1 ? 512 : 256,
      HEIGHT: dpr > 1 ? 512 : 256,
      TIME: selectedDate,
    };

    // Add elevation if provided
    if(isNotEmpty(selectedElevation)){
      paramObject.ELEVATION = selectedElevation;
    }

    const params = new URLSearchParams(paramObject).toString();
    const url = `${baseURL}?${params}&BBOX={bbox-epsg-3857}`;
    return url;
  }

  constructWmsGetCapabilitiesUrl() {
    const params = new URLSearchParams({
      SERVICE: "WMS",
      REQUEST: "GetCapabilities",
      VERSION: "1.3.0",
    });
    const { baseURL } = this._opt;
    return `${baseURL}?${params.toString()}`;
  }

  createLayerInfo(xmlDoc) {
    const { layerName } = this._opt;

    if (!layerName) {
      throw new Error("layerName is required for WMS service");
    }

    // Find the specific layer in the capabilities
    const layers = Array.from(xmlDoc.querySelectorAll("Layer"));
    const targetLayer = layers.find((layer) => {
      const nameElement = layer.querySelector("Name");
      return nameElement && nameElement.textContent === layerName;
    });

    if (!targetLayer) {
      const availableLayers = layers
        .map((l) => l.querySelector("Name")?.textContent)
        .filter(Boolean);
      throw new Error(
        `Layer '${layerName}' not found. Available layers: ${availableLayers.join(
          ", ",
        )}`,
      );
    }

    // Extract basic layer information
    const title = targetLayer.querySelector("Title")?.textContent || layerName;
    const abstract = targetLayer.querySelector("Abstract")?.textContent || "";

    // Extract styles
    const styleElements = Array.from(targetLayer.querySelectorAll("Style"));
    const styles = styleElements.map((styleEl) => {
      const name = styleEl.querySelector("Name")?.textContent || "";
      const legendEl = styleEl.querySelector("LegendURL OnlineResource");
      const url_legend = legendEl?.getAttribute("xlink:href") || null;

      return {
        name,
        url_legend,
      };
    });

    // Default style
    const style_default = this._opt.style || styles[0]?.name || "";

    const out = {
      title,
      abstract,
      styles,
      style_default,
      variables: [layerName], // For WMS, the layer name is the "variable"
      variable: layerName,
    };

    // Extract dimensions
    const dimensions = Array.from(targetLayer.querySelectorAll("Dimension"));

    // Handle elevation dimension
    const elevationDim = dimensions.find(
      (dim) => dim.getAttribute("name")?.toLowerCase() === "elevation",
    );

    if (elevationDim) {
      const elevationValues =
        elevationDim.textContent
          ?.split(",")
          .map((v) => v.trim())
          .filter(Boolean) || [];

      out.elevation_values = elevationValues;
      out.elevation_default = this._opt.elevation || elevationValues[0];
      out.elevation_unit = elevationDim.getAttribute("units") || "m";
    }

    // Handle time dimension
    const timeDim = dimensions.find(
      (dim) => dim.getAttribute("name")?.toLowerCase() === "time",
    );

    if (timeDim) {
      const timeValues = timeDim.textContent?.trim();
      if (timeValues) {
        // Parse time dimension - can be single values or intervals
        out.time_slots = this.parseWmsTimeSlots(timeValues);

        // Set default time
        const defaultTime = timeDim.getAttribute("default");
        if (defaultTime) {
          out.time_default = DateTime.fromISO(defaultTime).toUTC();
        } else if (out.time_slots.length > 0) {
          // Use the last available time as default
          const lastSlot = out.time_slots[out.time_slots.length - 1];
          out.time_default = lastSlot.end;
        }
      }
    }

    return out;
  }

  parseWmsTimeSlots(timeString) {
    // Handle different WMS time dimension formats
    // Examples:
    // - Single dates: "2007-02-02T00:00:00.000Z,2007-02-18T00:00:00.000Z,..."
    // - Intervals: "2007-02-02T00:00:00.000Z/2025-02-02T00:00:00.000Z/P2W2D"
    // - Mixed formats

    const timeValues = timeString.split(",").map((v) => v.trim());
    const slots = [];

    for (const timeValue of timeValues) {
      if (timeValue.includes("/")) {
        // This is an interval specification
        const parts = timeValue.split("/");
        if (parts.length === 3) {
          // start/end/period format
          const [startStr, endStr, periodStr] = parts;
          const start = DateTime.fromISO(startStr).toUTC();
          const end = DateTime.fromISO(endStr).toUTC();
          const step = Duration.fromISO(periodStr);

          if (start.isValid && end.isValid && step.isValid) {
            const interval = Interval.fromDateTimes(start, end);
            slots.push({
              step,
              interval,
              start,
              end,
              hour: start.hour,
            });
          }
        }
      } else {
        // Single date value
        const dateTime = DateTime.fromISO(timeValue).toUTC();
        if (dateTime.isValid) {
          // Create a single-point interval
          const interval = Interval.fromDateTimes(dateTime, dateTime);
          const step = Duration.fromISO("P1D"); // Default step

          slots.push({
            step,
            interval,
            start: dateTime,
            end: dateTime,
            hour: dateTime.hour,
          });
        }
      }
    }

    return slots.filter(isNotEmpty);
  }
}
