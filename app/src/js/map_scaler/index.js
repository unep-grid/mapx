import { bindAll } from "../bind_class_methods";
import { isArray, isNumeric } from "../is_test";
import { settings } from "../settings";

export class MapScaler {
  constructor(map) {
    const ms = this;
    ms._map = map;
    ms._pending = null;
    bindAll(ms);
    ms._map.on("idle", ms.render);
  }

  update(value = 1, type = ["text", "icon"]) {
    const ms = this;

    if (value == null) {
      return;
    }

    if (!isArray(type)) {
      throw new Error("scale method requires type");
    }

    ms._updateSettings(value, type);
    ms._pending = { value, type };

    if (ms._map.isStyleLoaded()) {
      ms.render();
    }
  }

  render() {
    const ms = this;

    if (!ms._pending || !ms._map) {
      return;
    }

    const { value, type } = ms._pending;
    const layers = ms._map.getStyle().layers;
    const scaleText = type.includes("text");
    const scaleIcon = type.includes("icon");

    for (const layer of layers) {
      if (layer.layout) {
        if (scaleText && layer.layout["text-size"]) {
          const newSize = ms._scaleLayoutSize(layer.layout["text-size"], value);
          ms._map.setLayoutProperty(layer.id, "text-size", newSize);
        }
        if (scaleIcon && layer.layout["icon-size"]) {
          const newSize = ms._scaleLayoutSize(layer.layout["icon-size"], value);
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

  destroy() {
    const ms = this;
    if (ms._map) {
      ms._map.off("idle", ms.render);
      ms._map = null;
    }
  }

  _updateSettings(value, type) {
    if (type.includes("text")) {
      settings.scale_text = value;
    }
    if (type.includes("icon")) {
      settings.scale_icon = value;
    }
  }

  _scaleLayoutSize(expr, scalingFactor) {
    const ms = this;
    const scaled = ms._scale_expr(expr, scalingFactor);
    if (scaled.found) {
      return scaled.expr;
    }
    if (ms._isZoomInterpolate(expr)) {
      return ms._scaleInterpolateOutputs(expr, scalingFactor);
    }
    if (ms._isZoomStep(expr)) {
      return ms._scaleStepOutputs(expr, scalingFactor);
    }
    return ["*", expr, scalingFactor];
  }

  _scale_expr(expr, scalingFactor) {
    const ms = this;

    if (ms.isScalable(expr)) {
      expr[2] = scalingFactor;
      return { expr, found: true };
    }

    if (isArray(expr)) {
      let found = false;
      const exprScaled = expr.map((subExpr) => {
        const scaled = ms._scale_expr(subExpr, scalingFactor);
        found = found || scaled.found;
        return scaled.expr;
      });
      return { expr: found ? exprScaled : expr, found };
    }

    return { expr, found: false };
  }

  isScalable(expr) {
    return (
      isArray(expr) &&
      expr.length === 3 &&
      expr[0] === "*" &&
      isNumeric(expr[2])
    );
  }

  _isZoomInterpolate(expr) {
    return isArray(expr) && expr[0] === "interpolate" && msIsZoom(expr[2]);
  }

  _isZoomStep(expr) {
    return isArray(expr) && expr[0] === "step" && msIsZoom(expr[1]);
  }

  _scaleInterpolateOutputs(expr, scalingFactor) {
    return expr.map((part, index) => {
      const isStopOutput = index >= 4 && index % 2 === 0;
      return isStopOutput ? this._scaleLayoutSize(part, scalingFactor) : part;
    });
  }

  _scaleStepOutputs(expr, scalingFactor) {
    return expr.map((part, index) => {
      const isDefaultOutput = index === 2;
      const isStopOutput = index >= 4 && index % 2 === 0;
      return isDefaultOutput || isStopOutput
        ? this._scaleLayoutSize(part, scalingFactor)
        : part;
    });
  }
}

function msIsZoom(expr) {
  return isArray(expr) && expr.length === 1 && expr[0] === "zoom";
}
