import { el } from "../../el_mapx";
import { isEmpty } from "../../is_test";
import { fileFormatsVectorDownload } from "../../uploader/utils";

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
      const formats = await fileFormatsVectorDownload();
      callback(formats);
      tom.settings.load = null;
    } catch (e) {
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
  onChange: function () {
    const tom = this;
    tom.blur();
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
            data.fileExt,
          )}`,
        ),
      );
    },
    item: (data, escape) => {
      return el(
        "div",
        el("span", escape(data.name)),
        el(
          "span",
          { class: ["text-muted", "space-around"] },
          `${escape(data.driver)}`,
        ),
      );
    },
  },
};

