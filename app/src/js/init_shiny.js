import "../css/mx_content_tools.css";
import "../css/mx_view_toggle.css";
import "../css/mx_shiny.css";
import "./shiny.js";
import "./mx_binding_helper.js";
import "./mx_binding_pwd.js";
import { reload } from "./app_utils";
import { modal } from "./mx_helper_modal";

console.log("INIT SHINY");

$(document).on("shiny:disconnected", () => {
  modal({
    title: "Disconnected",
    content: "This session has been disconnected...",
    onClose: reload,
    textCloseButton: "Reload",
    addBackground: true,
    noShinyBinding: true,
  });
});
