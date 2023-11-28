import { JSONEditor } from "@json-editor/json-editor";
import { getGemetConcept, searchGemet } from "./../gemet_util/index.js";
import { el } from "./../el_mapx";
import { isArray } from "./../is_test/index.js";
import TomSelect from "tom-select";

JSONEditor.defaults.resolvers.unshift(function (schema) {
  if (schema.type === "array" && schema.format === "selectizeGemet") {
    return "selectizeGemet";
  }
});

/**
 * Gemet specific input : remote fetch
 */
JSONEditor.defaults.editors.selectizeGemet = class mxeditors extends (
  JSONEditor.AbstractEditor
) {
  async initValue(value) {
    const editor = this;
    const selectize = editor.input.selectize;
    if (editor._init_value) {
      return;
    }
    /*
     * Add initial option:
     * Fetch concepts and push items like
     * {value:<string>,definition:<string>,label:<string>}
     */
    if (value.length > 0) {
      const concepts = await getGemetConcept(value);
      for (let c of concepts) {
        selectize.addOption(c);
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
      valueField: "concept",
      labelField: "label",
      searchField: ["label", "definition"],
      //sortField : 'score', //do not work :(
      options: [],
      create: false,
      multiple: true,
      maxItems: 20,
      render: {
        option: function (item, escape) {
          return el(
            "div",
            {
              class: ["hint", "hint--top-right"],
              style: {
                padding: "10px",
                display: "flex",
              },
              "aria-label": escape(item.definition),
            },
            el("span", escape(item.label)),
          );
        },
      },
      score: function () {
        /**
         * For sifter score on the 'github repos' example, check this:
         * https://github.com/selectize/selectize.js/blob/efcd689fc1590bc085aee728bcda71373f6bd0ff/examples/github.html#L129
         * Here, we use score from similarity, trgm
         */

        return function (item) {
          return item.score;
        };
      },
      load: async function (query, callback) {
        /**
         * When the user search, fetch and
         * format results for the callback
         */
        if (!query.length) return callback();
        this.clearOptions();
        try {
          const data = await searchGemet(query);
          return callback(data.hits);
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
