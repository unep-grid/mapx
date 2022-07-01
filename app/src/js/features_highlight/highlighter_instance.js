import { theme } from "./../mx.js";
import { Highlighter } from "./index.js";

export class HighlighterMapx extends Highlighter {
  constructor() {
    super({
      use_animation: true,
      register_listener: false, //use  same click as for popup
      highlight_color: theme.getColorThemeItem("mx_map_feature_highlight"),
      regex_layer_id: /^MX/, // Highlighter will not work with feature without id : regex layer accordingly,
    });
  }
}
