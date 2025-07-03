import { BaseTimeMapLegend } from "../shared/base_time_map_legend.js";
import { isEmpty } from "../../is_test";
import { isNotEmpty } from "../../is_test";
import { isDateString } from "../../is_test";
import { DateTime, Duration, Interval } from "luxon";
import "./style.less";

/**
 * CMEMS-specific implementation for WMTS time-enabled map legends
 * Extends BaseTimeMapLegend with CMEMS/WMTS-specific functionality
 */
export class TimeMapLegend extends BaseTimeMapLegend {
  constructor(options) {
    super(options);
  }

  // Override container class for CMEMS-specific styling
  getContainerClass() {
    return "cmems_extension";
  }

  // Implement abstract method for URL construction
  constructUrl(selectedDate, selectedElevation, selectedStyle) {
    return this.constructWmtsUrl(selectedDate, selectedElevation, selectedStyle);
  }

  // Implement abstract method for capabilities URL
  constructGetCapabilitiesUrl() {
    return this.constructWmsGetCapabilitiesUrl();
  }

  // Implement abstract method for legend URL
  getLegendUrl() {
    const data = this.getLayerInfo("styles").find((s) => {
      return s.name === this._opt.style;
    });
    return data?.url_legend;
  }

  constructWmtsUrl(selectedDate, selectedElevation, selectedStyle) {
    const { variable, baseURL, product, dataset, dpr } = this._opt;

    const layer = `${product}/${dataset}/${variable}`;

    const style = [selectedStyle, "inverse", "noclamp", "logscale"]
      .filter(isEmpty)
      .join(",");

    const paramObject = {
      service: "WMTS",
      version: "1.0",
      request: "GetTile",
      layer: layer,
      tilematrixset: dpr > 1 ? "EPSG:3857@2x" : "EPSG:3857",
      style: style,
      elevation: selectedElevation,
      time: selectedDate,
    };

    const params = new URLSearchParams(paramObject).toString();
    const tile = "&tileMatrix={z}&tileRow={y}&tileCol={x}";
    const url = `${baseURL}?${params}${tile}`;
    return url;
  }

  constructWmsGetCapabilitiesUrl() {
    const params = new URLSearchParams({
      service: "WMS",
      request: "GetCapabilities",
      version: "1.3.0",
    });
    const { baseURL, product, dataset } = this._opt;
    return `${baseURL}/${product}/${dataset}/?${params.toString()}`;
  }


  createLayerInfo(xmlDoc) {
    let { variable } = this._opt;

    /**
     * NOTE: this should work for the prototype, but
     * we should probably handle namespace, like (ows:<Key>)
     * Possible solution :
     * - getElementsByTagNameNS ?
     * - xPath ?
     */
    const layers = Array.from(xmlDoc.querySelectorAll("Contents Layer"));
    const variables = layers.map(
      (l) => l.querySelector("VariableInformation Id")?.textContent,
    );

    if (isEmpty(variable)) {
      variable = variables[0];
      this._opt.variable = variable;
    }

    const variableExists = variables.includes(variable);

    if (!variableExists) {
      const variablesPrint = variables.join(",\n");
      throw new Error(
        `Invalid variable '${variable}' Available names : '${variablesPrint} `,
      );
    }

    /**
     * Get layer data
     */
    const layer = layers.find(
      (l) => l.querySelector("VariableInformation Id").textContent === variable,
    );

    const dimensions = Array.from(layer.querySelectorAll("Dimension"));

    const meta = layer.querySelector("VariableInformation");

    const title = meta.querySelector("Name").textContent;
    const abstract = ""; // seems to be in doc -> Themes>Theme>Theme>Title...

    const styles = Array.from(layer.querySelectorAll("Style Identifier")).map(
      (s) => {
        return {
          name: s.textContent,
          url_legend: null,
        };
      },
    );

    const style = this._opt.style || styles[0]?.name;

    const out = {
      title,
      styles,
      abstract,
      style_default: style,
      variables: Array.from(new Set(variables)),
      variable: variable,
    };

    /**
     * Elevation
     */
    const nodeElevation = dimensions.find(
      (d) => d.querySelector("Identifier").textContent === "elevation",
    );

    if (nodeElevation) {
      out.elevation_default =
        this._opt.elevation ||
        nodeElevation.querySelector("Default").textContent;

      out.elevation_values = Array.from(
        nodeElevation.querySelectorAll("Value"),
      ).map((v) => v.textContent);

      out.elevation_unit =
        nodeElevation.querySelector("UnitSymbol").textContent;
    }

    /**
     * Time
     */
    const nodeTime = dimensions.find(
      (d) => d.querySelector("Identifier").textContent === "time",
    );

    if (nodeTime) {
      const validInterval =
        nodeTime.querySelector("UOM").textContent === "ISO8601";
      if (validInterval) {
        const timeDefault = nodeTime.querySelector("Default").textContent;
        out.time_default = DateTime.fromISO(timeDefault).toUTC();
        out.time_slots = this.parseTimeSlots(nodeTime);
      }
    }

    return out;
  }

}
