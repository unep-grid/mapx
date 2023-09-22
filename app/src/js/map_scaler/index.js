import { bindAll } from "../bind_class_methods";
import { isArray, isNumeric } from "../is_test";
import { settings } from "../settings";

export class MapScaler {
  constructor(map) {
    const ms = this;
    ms._map = map;
    bindAll(ms);
    ms._map.on("idle", ms.render);
  }

  update(value = 1, type = ["text", "icon"]) {
    const ms = this;

    if (value == null) {
      return;
    }

    ms._pending = { value, type };

    if (ms._map.isStyleLoaded()) {
      ms.render();
    }
  }

  render() {
    const ms = this;

    if (!ms._pending) {
      return;
    }

    const { value, type } = ms._pending;

    const layers = ms._map.getStyle().layers;

    if (!isArray(type)) {
      throw new Error("scale method requires type");
    }

    const scaleText = type.includes("text");
    const scaleIcon = type.includes("icon");
    if (scaleText) {
      settings.scale_text = value;
    }
    if (scaleIcon) {
      settings.scale_icon = value;
    }

    for (const layer of layers) {
      if (layer.layout) {
        if (scaleText && layer.layout["text-size"]) {
          const newSize = ms._scale_expr(layer.layout["text-size"], value);
          ms._map.setLayoutProperty(layer.id, "text-size", newSize);
        }
        if (scaleIcon && layer.layout["icon-size"]) {
          const newSize = ms._scale_expr(layer.layout["icon-size"], value);
          ms._map.setLayoutProperty(layer.id, "icon-size", newSize);
        }
      }
    }

    ms._pending = null;
  }

  text(value = 1) {
    const ms = this;
    return ms.update(value, ["text"]);
  }

  icon(value = 1) {
    const ms = this;
    return ms.update(value, ["icon"]);
  }

  _scale_expr(expr, scalingFactor) {
    const ms = this;
    if (ms.isScalable(expr)) {
      expr[2] = scalingFactor;
      return expr;
    }
    if (isArray(expr)) {
      return expr.map((subExpr) => ms._scale_expr(subExpr, scalingFactor));
    }
    return expr;
  }

  isScalable(expr) {
    return (
      isArray(expr) &&
      expr.length === 3 &&
      expr[0] === "*" &&
      isNumeric(expr[1])
    );
  }
}
