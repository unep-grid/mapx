import {el} from '@fxi/el';
import {settings} from './settings.js';
import {onNextFrame} from './../animation_frame/index.js';
import './style.css';
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
    this.build();
    this.updateContext();
    this.update(0);
  }

  destroy() {
    if(this.elTarget && this.el){
      this.elTarget.removeChild(this.el);
    }
  }

  build() {
    let rp = this;
    rp.elCanvas = el('canvas', {
      style: {
        width: rp.opt.radius * 2 + 'px',
        height: rp.opt.radius * 2 + 'px'
      }
    });
    rp.el = el(
      'div',
      {
        class: 'radial-progress'
      },
      rp.elCanvas
    );
    rp.elTarget.appendChild(rp.el);
    window.rp = rp;
  }

  updateContext() {
    let rp = this;
    var dpr = window.devicePixelRatio || 1;
    var rect = rp.elCanvas.getBoundingClientRect();
    rp.elCanvas.width = rect.width * dpr;
    rp.elCanvas.height = rect.height * dpr;
    var ctx = rp.elCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    rp.ctx = ctx;
    rp.ctx.lineWidth = rp.opt.stroke;
    rp.ctx.strokeStyle = rp.opt.strokeColor;
  }

  update(percent) {
    let rp = this;
    onNextFrame(() => {
      rp.updateContext();
      rp.clear();
      rp.ctx.beginPath();
      rp.ctx.arc(rp.opt.radius,rp.opt.radius, rp.opt.radius - rp.opt.stroke, 0, (percent / 100) * 2 * Math.PI);
      rp.ctx.stroke();
    });
  }

  clear() {
    let rp = this;
    rp.ctx.clearRect(0, 0, rp.elCanvas.width, rp.elCanvas.height);
  }
}
export {RadialProgress};
