import { ElementCreator } from "./../el/src/index.js";
import { settings } from "./settings.js";
import { onNextFrame, cancelFrame } from "./../animation_frame/index.js";
import { isEmpty } from "./../is_test/index.js";
import "./style.css";
/**
 * Build a simple radial progress svg element
 * @param {String|Element} selector  : the container selector or element to insert the progress radial
 * @param {Object} c config
 * @param {Integer} c.radius Radius of the radial input, in pixel
 * @param {Integer} c.stroke Width of the stroke in pixel
 */
class RadialProgress {
  constructor(elTarget, opt) {
    let rp = this;
    rp.elTarget = elTarget;
    rp.opt = Object.assign({}, settings, opt);
    rp.init();
  }

  init() {
    this.elCreator = new ElementCreator({
      document: this.elTarget.ownerDocument,
    });
    this.build();
    this.updateContext();
    this.update(0);
  }

  destroy() {
    let rp = this;
    cancelFrame(rp._fid);
    if (rp.elTarget && rp.el) {
      rp.el.remove();
    }
  }

  build() {
    let rp = this;
    const { el } = rp.elCreator;
    rp.elCanvas = el("canvas", {
      style: {
        width: rp.opt.radius * 2 + "px",
        height: rp.opt.radius * 2 + "px",
      },
    });
    rp.el = el(
      "div",
      {
        class: "radial-progress",
      },
      rp.elCanvas,
    );
    rp.elTarget.appendChild(rp.el);
  }

  circle(percent, color) {
    const rp = this;
    rp.ctx.strokeStyle = color || rp.opt.strokeColor;
    rp.ctx.beginPath();
    rp.ctx.arc(
      rp.opt.radius,
      rp.opt.radius,
      rp.opt.radius - rp.opt.stroke,
      0,
      (percent / 100) * 2 * Math.PI,
    );
    rp.ctx.stroke();
  }

  text(text) {
    const rp = this;
    text = isEmpty(text) ? `${Math.ceil(rp._p)}%` : text;
    rp.ctx.fillStyle = rp.opt.strokeColor;
    rp.ctx.fillText(
      text,
      rp.opt.radius,
      rp.opt.radius + 0.5 * rp.opt.fontHeight,
      rp.opt.radius * 2,
    );
  }

  updateContext() {
    let rp = this;
    let dpr = rp.elTarget.ownerDocument.defaultView.devicePixelRatio || 1;
    let rect = rp.elCanvas.getBoundingClientRect();
    rp.elCanvas.width = dpr * rect.width;
    rp.elCanvas.height = dpr * rect.height;
    rp.ctx = rp.elCanvas.getContext("2d");
    rp.ctx.scale(dpr, dpr);
    rp.ctx.lineWidth = rp.opt.stroke;
    rp.ctx.strokeStyle = rp.opt.strokeColor;
    rp.ctx.fillStyle = rp.opt.trackColor;
    rp.ctx.textAlign = "center";
    rp.ctx.font = `bold ${rp.opt.fontHeight}px ${rp.opt.fontFamily}`;
    rp.ctx.lineCap = "round";
  }

  /** @param {boolean} [active] */
  setIndeterminate(active = true) {
    this.update(active ? 25 : 0);
    this.el.classList.toggle("radial-progress--indeterminate", active);
    this.indeterminate = active;
    this.el.removeAttribute("aria-valuenow");
  }

  update(percent, text) {
    const rp = this;
    this.indeterminate = false;
    this.el.classList.remove("radial-progress--indeterminate");
    this.el.setAttribute("role", "progressbar");
    this.el.setAttribute("aria-valuemin", "0");
    this.el.setAttribute("aria-valuemax", "100");
    this.el.setAttribute("aria-valuenow", String(Math.round(percent)));
    percent = Math.ceil(percent);
    cancelFrame(rp._fid);
    rp._fid = onNextFrame(() => {
      rp._p = percent;
      rp.updateContext();
      rp.clear(percent);
      if (rp.opt.addTrack) {
        rp.circle(100, rp.opt.trackColor);
      }
      rp.circle(percent);
      if (rp.opt.addText && !rp.indeterminate) {
        rp.text(text);
      }
    });
  }

  clear() {
    let rp = this;
    cancelFrame(rp._fid);
    rp.ctx.clearRect(0, 0, rp.elCanvas.width, rp.elCanvas.height);
  }
}
export { RadialProgress };
