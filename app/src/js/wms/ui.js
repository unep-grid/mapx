import { isUrl } from "./../is_test/index.js";
import { modal } from "./../mx_helper_modal.js";
import { moduleLoad } from "./../modules_loader_async";
import { setBusy } from "./../mx_helper_misc.js";
import { el, elSpanTranslate } from "./../el_mapx/index.js";
import { wmsGetLayers, urlTile, urlLegend } from "./index.js";
import { errorFormater } from "../error_handler/index.js";

export async function wmsBuildQueryUi(opt) {
  opt = Object.assign(
    {},
    { useMirror: false, useCache: false, timestamp: null },
    opt,
  );

  const TomSelect = await moduleLoad("tom-select");
  const elInputTiles = document.querySelector(opt.selectorTileInput);
  const elInputLegend = document.querySelector(opt.selectorLegendInput);
  const elInputAddMirror = document.querySelector(opt.selectorUseMirror);
  const elInputTileSize = document.querySelector(opt.selectorTileSizeInput);

  const elParent =
    document.querySelector(opt.selectorParent) || elInputTiles.parentElement;
  const services = opt.services;

  let selectLayer, selectServices;

  if (!elInputTiles || !elInputLegend) {
    return;
  }

  /**
   * Build
   */

  const elSelectServices = el("select", {
    class: "form-control",
  });
  const elSelectLayer = el("select", {
    class: "form-control",
  });

  const elSelectServicesGroup = el(
    "div",
    { class: ["form-group"] },
    el("label", elSpanTranslate("wms_select_reviewed_service")),
    el("div", elSelectServices),
  );

  const elInputService = el("input", {
    type: "text",
    class: ["form-control"],
    on: {
      change: initSelectLayer,
      input: checkDisableBtnUpdateLayerList,
    },
  });

  const elButtonGetLayers = el(
    "button",
    {
      class: ["btn", "btn-default"],
      on: {
        click: getLayers,
      },
    },
    elSpanTranslate("wms_btn_get_layers"),
  );

  const elInputServiceGroup = el(
    "div",
    { class: ["form-group"] },
    el("label", elSpanTranslate("wms_input_service_url")),
    el(
      "div",
      {
        class: "input-group",
      },
      elInputService,
      el(
        "span",
        {
          class: "input-group-btn",
        },
        elButtonGetLayers,
      ),
    ),
  );

  const elButtonUpdate = el("button", elSpanTranslate("wms_btn_generate_url"), {
    class: ["btn", "btn-default"],
    on: {
      click: updateInput,
    },
  });

  const elInputLayerGroup = el(
    "div",
    { class: ["form-group"] },
    el("label", elSpanTranslate("wms_select_layer")),
    elSelectLayer,
    elButtonUpdate,
  );

  elParent.appendChild(elSelectServicesGroup);
  elParent.appendChild(elInputServiceGroup);
  elParent.appendChild(elInputLayerGroup);

  initSelectServices();
  initSelectLayer();

  /**
   * Local helpers
   */
  function useMirror() {
    return opt.useMirror || elInputAddMirror.checked;
  }

  async function getLayers() {
    busy(true);
    const url = elInputService.value;
    try {
      if (!isUrl(url)) {
        throw new Error("Not a valid url");
      }

      const layers = await wmsGetLayers(url, {
        optGetCapabilities: {
          searchParams: {
            timestamp: opt.timestamp,
          },
          useMirror: useMirror(),
          useCache: opt.useCache,
        },
      });
      if (layers.length === 0) {
        modal({
          title: "No layer found",
          content: el("p", `No layer found`),
          addBackground: true,
        });
      } else {
        initSelectLayer(layers);
      }
      busy(false);
    } catch (e) {
      busy(false);
      e = errorFormater(e);

      modal({
        title: "Issue when fetching layers",
        content: el(
          "div",
          el("p", `Issue when fetching layers`),
          el("pre", `${e.message}`),
        ),
        addBackground: true,
      });
    }
  }

  function initSelectLayer(data) {
    data = data || [];
    const def = data[0] && data[0].Name ? data[0].Name : data[0];

    if (selectLayer && selectLayer.destroy) {
      selectLayer.destroy();
    }

    // Clear existing options
    elSelectLayer.innerHTML = "";

    selectLayer = new TomSelect(elSelectLayer, {
      options: data.map((item) => ({
        value: item.Name || item,
        text: item.Title || item.Name || item,
        name: item.Name || item,
        title: item.Title || item.Name || item,
        abstract: item.Abstract || "",
      })),
      valueField: "value",
      labelField: "text",
      searchField: ["name", "title", "abstract"],
      onChange: checkDisableBtnUpdate,
      render: {
        item: function (data, escape) {
          const content = [];
          if (data.title) {
            content.push(
              `<span class="item-label">${escape(data.title)}</span>`,
            );
          }
          if (data.name) {
            content.push(`<span class="item-desc">${escape(data.name)}</span>`);
          }
          return `<div class="item-desc" title="${escape(
            data.abstract,
          )}">${content.join("")}</div>`;
        },
        option: function (data, escape) {
          const content = [];
          if (data.title) {
            content.push(
              `<span class="item-label">${escape(data.title)}</span>`,
            );
          }
          if (data.name) {
            content.push(`<span class="item-desc">${escape(data.name)}</span>`);
          }
          return `<div class="item-desc" title="${escape(
            data.abstract,
          )}">${content.join("")}</div>`;
        },
      },
    });

    if (def) {
      selectLayer.setValue(def);
    }
    checkDisableBtnUpdateLayerList();
    checkDisableBtnUpdate();
  }

  function initSelectServices() {
    selectServices = new TomSelect(elSelectServices, {
      options: services.map((service) => ({
        value: service.value,
        text: service.label,
      })),
      valueField: "value",
      labelField: "text",
      onChange: updateServiceValue,
    });

    if (services.length > 0) {
      selectServices.setValue(services[0].value);
    }
    selectServices.refreshOptions();
  }

  function updateInput() {
    const layer = selectLayer.getValue();
    if (!layer) {
      modal({
        title: "No layer set",
        content: el("p", "No layer set: ignoring request"),
        addBackground: true,
      });
      return;
    }
    elInputTiles.value = urlTile({
      layer: layer,
      url: elInputService.value,
      width: elInputTileSize.value || 512,
      height: elInputTileSize.value || 512,
    });
    elInputLegend.value = urlLegend({
      url: elInputService.value,
      layer: selectLayer.getValue(),
    });
    elInputTiles.dispatchEvent(new Event("change"));
    elInputLegend.dispatchEvent(new Event("change"));
  }

  function updateServiceValue(value) {
    elInputService.value = value;
    checkDisableBtnUpdateLayerList();
    initSelectLayer();
  }

  function checkDisableBtnUpdateLayerList() {
    const url = elInputService.value;
    const valid = isUrl(url);
    if (valid) {
      elButtonGetLayers.removeAttribute("disabled");
    } else {
      elButtonGetLayers.setAttribute("disabled", true);
    }
  }

  function checkDisableBtnUpdate() {
    const layer = selectLayer ? selectLayer.getValue() : null;
    if (layer) {
      elButtonUpdate.removeAttribute("disabled");
    } else {
      elButtonUpdate.setAttribute("disabled", true);
    }
  }

  function busy(busy) {
    if (busy) {
      setBusy(true);
      elInputService.setAttribute("disabled", true);
      elButtonGetLayers.setAttribute("disabled", true);
      elButtonUpdate.setAttribute("disabled", true);
      if (selectServices && selectServices.disable) {
        selectServices.disable();
      }
      if (selectLayer && selectLayer.disable) {
        selectLayer.disable();
      }
    } else {
      setBusy(false);
      elInputService.removeAttribute("disabled");
      elButtonGetLayers.removeAttribute("disabled");
      elButtonUpdate.removeAttribute("disabled");
      if (selectServices && selectServices.enable) {
        selectServices.enable();
      }
      if (selectLayer && selectLayer.enable) {
        selectLayer.enable();
      }
    }
  }
}
