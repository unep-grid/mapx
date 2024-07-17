import { JSONEditor } from "@json-editor/json-editor";
import TomSelect from "tom-select"; 
import { el } from "./../../el_mapx";
import { isArray, isEmpty, isNotEmpty } from "./../../is_test/index.js";
import { getMetadataKeywords } from "./../../metadata/keywords.js";

JSONEditor.defaults.resolvers.unshift(function (schema) {
  if (schema.type === "array" && schema.format === "selectizeMetaKeywords") {
    return "selectizeMetaKeywords";
  }
});

/**
 * Metadata keywords input : remote websocket fetch
 */
JSONEditor.defaults.editors.selectizeMetaKeywords = class mxeditors extends (
  JSONEditor.AbstractEditor
) {
  async initValue(keywords) {
    const editor = this;
    const selectize = editor.input.selectize;
    if (editor._init_value) {
      return;
    }
    /*
     * Add initial option:
     */
    if (isNotEmpty(keywords)) {
      for (const keyword of keywords) {
        selectize.addOption({ keyword, score: 1 });
      }
      editor._init_value = true;
    }
  }
  build() {
    const editor = this;
    editor.title = editor.theme.getFormInputLabel(editor.getTitle());
    editor.title_controls = editor.theme.getHeaderButtonHolder();
    editor.title.appendChild(editor.title_controls);
    editor.error_holder = document.createElement("div");

    if (editor.schema.description) {
      editor.description = editor.theme.getDescription(
        editor.schema.description,
      );
    }

    editor.input = document.createElement("select");
    editor.input.setAttribute("multiple", "multiple");

    const group = editor.theme.getFormControl(
      editor.title,
      editor.input,
      editor.description,
    );

    editor.container.appendChild(group);
    editor.container.appendChild(editor.error_holder);

    editor.input.selectize = new TomSelect(editor.input, {
      plugins: ["remove_button"],
      valueField: "keyword",
      labelField: "keyword",
      searchField: "keyword",
      options: [],
      create: true,
      multiple: true,
      maxItems: 20,
      render: {
        option: function (item, escape) {
          return el(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                padding: "10px",
                paddingLeft: "15px",
              },
            },
            [
              el("span", escape(item.keyword)),
              el(
                "span",
                {
                  title: ` Proximity score : ${escape(
                    Math.round(item.similarity * 100) / 100,
                  )}`,
                },
                `(${escape(item.count || 1)})`,
              ),
            ],
          );
        },
      },
      score: function () {
        return function (item) {
          return item.similarity;
        };
      },
      load: async function (query, callback) {
        /**
         * When the user search, fetch and
         * format results for the callback
         */
        if (isEmpty(query)) {
          return callback();
        }
        this.clearOptions();
        try {
          const data = await getMetadataKeywords(query);
          return callback(data);
        } catch (e) {
          console.warn(e);
          return callback();
        }
      },
    });

    editor.refreshValue();
  }
  postBuild() {
    const editor = this;
    editor.input.selectize.on("change", function () {
      editor.refreshValue();
      editor.onChange(true);
    });
  }
  destroy() {
    const editor = this;
    editor.empty(true);
    if (editor.title && editor.title.parentNode) {
      editor.title.parentNode.removeChild(editor.title);
    }
    if (editor.description && editor.description.parentNode) {
      editor.description.parentNode.removeChild(editor.description);
    }
    if (editor.input && editor.input.parentNode) {
      editor.input.parentNode.removeChild(editor.input);
    }
    super.destroy();
  }
  empty() {}
  async setValue(value) {
    try {
      const editor = this;
      const selectize = editor.input.selectize;
      selectize.clear(true);
      value = isArray(value) ? value : [value];
      await editor.initValue(value);
      selectize.setValue(value);
      editor.refreshValue();
    } catch (e) {
      console.warn(e);
    }
  }
  refreshValue() {
    const editor = this;
    editor.value = editor.input.selectize.getValue();
  }
};

