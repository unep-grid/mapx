import { getApiUrl } from "./../api_routes";
import { el } from "../el_mapx";
import { isEmpty } from "../is_test";

const defaultFormat = "GPKG";

export const config = {
  valueField: "driver",
  searchField: ["driver", "name", "fileExt"],
  allowEmptyOption: false,
  options: null,
  maxItems: 1,
  load: async function (_, callback) {
    const tom = this;
    try {
      if (tom.loading > 1) {
        callback();
        return;
      }
      const url = getApiUrl("getFileFormatsList");
      const fileFormatsResp = await fetch(url);
      const fileFormats = await fileFormatsResp.json();
      const formatsVector = fileFormats.filter((f) => {
        return f.download && f.type === "vector";
      });
      callback(formatsVector);
      tom.settings.load = null;
    } catch (e) {
      console.error(e);
      callback();
    }
  },
  create: false,
  sortField: { field: "name" },
  onInitialize: async function () {
    const tom = this;
    await tom.load();
  },
  onLoad: function () {
    const tom = this;
    tom.setValue(defaultFormat);
  },
  onBlur: function () {
    const tom = this;
    const v = tom.getValue();
    if (isEmpty(v)) {
      tom.setValue(defaultFormat);
    }
  },
  dropdownParent: "body",
  render: {
    option: (data, escape) => {
      return el(
        "div",
        el("h4", escape(data.name)),
        el(
          "small",
          `Driver: ${escape(data.driver)} | File extensions: ${escape(
            data.fileExt
          )}`
        )
      );
    },
    item: (data, escape) => {
      return el(
        "div",
        el("span", escape(data.name)),
        el(
          "span",
          { class: ["text-muted", "space-around"] },
          `${escape(data.driver)}`
        )
      );
    },
  },
};
