import $ from "jquery";
import * as Selectize from "selectize";
import "webpack-jquery-ui/sortable";
import "selectize/dist/css/selectize.css";
import "selectize/dist/css/selectize.bootstrap3.css";
import "../css/mx_selectize.css";
window.jQuery = $;
window.$ = $;
window.Selectize = Selectize;

window.addEventListener("load", async () => {
  /**
   * Additional modules required by Shiny. 
   */
  await import("selectize-plugin-a11y");

  /*
   * Patch for placing drop downrelative to a div
   * https://github.com/selectize/selectize.js/pull/1447/commits
   */
  Selectize.prototype.positionDropdown = function () {
    var $control = this.$control;
    this.$dropdown
      .offset({
        top: $control.offset().top + $control[0].offsetHeight,
        left: $control.offset().left,
      })
      .css({
        width: $control[0].getBoundingClientRect().width,
      });
  };
});
