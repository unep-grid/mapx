import { create, formatters } from "jsondiffpatch";
import "jsondiffpatch/dist/formatters-styles/html.css";

export async function jsonPreview(json, options) {
  const m = import("json-formatter-js");
  const JSONFormatter = m[0].default;
  var formatted = new JSONFormatter(json, options);
  return formatted.render();
}

export async function jsonDiff(a, b, opt) {
  opt = opt || {};
  const instance = create({
    arrays: {
      detectMove: true,
      includeValueOnMove: false,
    },
    textDiff: {
      minLength: 60,
    },
    propertyFilter:
      opt.propertyFilter instanceof Function ? opt.propertyFilter : null,
    cloneDiffValues: false,
  });

  const delta = instance.diff(a, b);

  if (opt.toHTML) {
    formatters.html.hideUnchanged();
    return formatters.html.format(delta, a);
  }
  return delta;
}
