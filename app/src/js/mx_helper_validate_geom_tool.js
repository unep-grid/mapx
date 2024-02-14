import { settings } from "./settings";
import { el } from "./el_mapx/index.js";
import { getJSON, handleRequestMessage } from "./mx_helper_misc";
import { getApiUrl } from "./api_routes";
import { objToParams } from "./url_utils";

export function getValidateSourceGeom(opt) {
  if (settings.user.guest) {
    return;
  }

  var elForm = document.getElementById(opt.idForm);
  var elButtonValidate = document.getElementById(opt.idButtonValidate);
  var elListMessage = elForm.querySelector("#" + opt.idListMessage);

  var host = getApiUrl("getSourceValidateGeom");
  var query = {
    idSource: opt.idSource,
    idUser: settings.user.id,
    token: settings.user.token,
    idProject: settings.project.id,
    useCache: opt.useCache || false,
    autoCorrect: opt.autoCorrect || false,
    analyze: opt.analyze || true,
  };
  var params = objToParams(query);
  var url = host + "?" + params;

  enableButtons(false);
  elListMessage.innerHTML = "";

  try {
    getJSON({
      maxWait: 1e3 * 120,
      url: url,
      onProgress: handleMessage,
      onMessage: handleMessage,
      onSuccess: handleMessage,
      onError: handleMessage,
      onTimeout: function (err) {
        console.log(err);
        var elTimeout = el("li", "Timeout reached, cancelled analysis.");
        elListMessage.appendChild(elTimeout);
        enableButtons(true);
      },
    });
  } catch (e) {
    enableButtons(true);
    throw new Error(e);
  }

  var messageStore = {};

  function handleMessage(msg) {
    return handleRequestMessage(msg, messageStore, {
      result: function (msg) {
        var elMsg = el(
          "li",
          { class: ["mx-log-item", "mx-log-white"] },
          el(
            "ul",
            el("li", el("b", msg.title || "")),
            el("li", el("span", "Valid: " + msg.valid || false)),
            el(
              "li",
              el("span", "Count of valid geometries: " + msg.stat.valid || 0),
            ),
            el(
              "li",
              el(
                "span",
                "Count of invalid geometries: " + msg.stat.invalid || 0,
              ),
            ),
            el(
              "li",
              el("span", "Count of unknown validity: " + msg.stat.unknown || 0),
            ),
            el("li", el("span", "Cache enabled: " + msg.useCache || false)),
            el(
              "li",
              el("span", "Automatic correction: " + msg.autoCorrect || false),
            ),
            el("li", el("span", "Analyze " + msg.analyze || false)),
          ),
          el("hr"),
        );
        elListMessage.appendChild(elMsg);
        enableButtons(true);
      },
      error: function (msg) {
        var elErr = el(
          "li",
          { class: ["mx-log-item", "mx-log-red"] },
          JSON.stringify(msg),
        );
        elListMessage.appendChild(elErr);
        enableButtons(true);
      },
      message: function (msg) {
        var elMsg = el("li", { class: ["mx-log-item", "mx-log-blue"] }, msg);
        elListMessage.appendChild(elMsg);
      },
    });
  }

  function enableButtons(enable) {
    if (enable) {
      elButtonValidate.removeAttribute("disabled");
    } else {
      elButtonValidate.setAttribute("disabled", "disabled");
    }
  }
}
