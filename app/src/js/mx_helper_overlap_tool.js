import { getApiUrl } from "./api_routes";
import { objToParams } from "./url_utils";
import { getJSON, handleRequestMessage } from "./mx_helper_misc.js";
import { el } from "./el/src/index.js";
import { settings } from "./settings";

export function getOverlapAnalysis(opt) {
  if (settings.user.guest) {
    return;
  }

  const elForm = document.getElementById(opt.idForm);
  const elButtonCompute = document.getElementById(opt.idButtonAnalyse);
  const elTextAreaResult = elForm.querySelector("#" + opt.idTextResult);
  const elListMessage = elForm.querySelector("#" + opt.idListMessage);

  const host = getApiUrl("getSourceOverlap");
  const query = {
    layers: opt.layers.join(","),
    countries: opt.countries.join(","),
    method: opt.method || "getArea",
    idUser: settings.user.id,
    token: settings.user.token,
    idProject: settings.project.id,
    sourceTitle: opt.sourceTitle,
  };

  const params = objToParams(query);
  const url = host + "?" + params;

  elButtonCompute.setAttribute("disabled", "disabled");

  getJSON({
    maxWait: 1e3 * 120,
    url: url,
    onProgress: handleMessage,
    onMessage: handleMessage,
    onSuccess: handleMessage,
    onError: handleMessage,
    onTimeout: function (_) {
      const elTimeout = el("li", "Timeout reached, cancelled analysis.");
      elListMessage.appendChild(elTimeout);
      elButtonCompute.removeAttribute("disabled");
    },
  });

  function updateLayerList() {
    Shiny.onInputChange("mx_client_update_source_list", {
      date: new Date() * 1,
    });
  }

  const messageStore = {};

  function handleMessage(msg) {
    return handleRequestMessage(msg, messageStore, {
      result: function (msg) {
        if (msg.content === "area") {
          let area = msg.value;
          const elArea = el(
            "li",
            { class: ["mx-log-item", "mx-log-white"] },
            "Area = " + area + "[" + msg.unit + "]"
          );
          elListMessage.appendChild(elArea);
          if (msg.unit === "m2") {
            area = area / 1e6;
          }
          elTextAreaResult.innerText = Math.round(area * 1000) / 1000;
        }
        if (msg.content === "sourceMeta") {
          updateLayerList();
        }
      },
      error: function (msg) {
        const elErr = el(
          "li",
          { class: ["mx-log-item", "mx-log-red"] },
          JSON.stringify(msg)
        );
        elListMessage.appendChild(elErr);
        elButtonCompute.removeAttribute("disabled");
      },
      message: function (msg) {
        const elMsg = el("li", { class: ["mx-log-item", "mx-log-blue"] }, msg);
        elListMessage.appendChild(elMsg);
      },
      warning: function (msg) {
        const li = el(
          "li",
          {
            class: ["mx-log-item", "mx-log-orange"],
          },
          msg
        );
        elProgressMessage.appendChild(li);
      },
      timing: function (msg) {
        const txtTiming = "duration = " + msg.duration + "[" + msg.unit + "]";
        const elTiming = el(
          "li",
          { class: ["mx-log-item", "mx-log-blue"] },
          txtTiming
        );
        elListMessage.appendChild(elTiming);
      },
      end: function (msg) {
        const elEnd = el("li", { class: ["mx-log-item", "mx-log-green"] }, msg);
        elListMessage.appendChild(elEnd);
        elButtonCompute.removeAttribute("disabled");
        elListMessage.appendChild(el("hr"));
      },
    });
  }
}
