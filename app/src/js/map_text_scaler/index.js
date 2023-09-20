import { bindAll } from "../bind_class_methods";
import { isArray, isNumeric } from "../is_test";

export class MapboxTextScaler {
  constructor(map) {
    const mtc = this;
    mtc._map = map;
    bindAll(mtc);
  }

  scaleText(value = 1) {
    const mtc = this;
    const layers = mtc._map.getStyle().layers;

    for (const layer of layers) {
      if (layer.layout) {
        if (layer.layout["text-size"]) {
          const newSize = mtc._scale_expr(layer.layout["text-size"], value);
          mtc._map.setLayoutProperty(layer.id, "text-size", newSize);
        }
        if (layer.layout["icon-size"]) {
          const newSize = mtc._scale_expr(layer.layout["icon-size"], value);
          mtc._map.setLayoutProperty(layer.id, "icon-size", newSize);
        }
      }
    }
  }

  _scale_expr(expr, scalingFactor) {
    const mtc = this;
    if (mtc.isScalable(expr)) {
      expr[2] = scalingFactor;
      console.log(expr);
      return expr;
    }
    if (isArray(expr)) {
      return expr.map((subExpr) => mtc._scale_expr(subExpr, scalingFactor));
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
