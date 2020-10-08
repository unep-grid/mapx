import {el} from '@fxi/el';
import './style.css';

const def = {
  icon: 'gears',
  duration: 800,
  scaleStart: 1,
  scaleEnd: 1.4,
  opacityStart: 0.2,
  opacityEnd: 0,
  x: null,
  y: null
};

class IconFlash {
  constructor(opt) {
    if (typeof opt === 'string') {
      opt = {icon: opt};
    }
    opt = Object.assign({}, def, opt);
    this.opt = opt;
    this.build();
    this.flash();
  }

  build() {
    this.elContainer = el(
      'div',
      {
        class: 'icon-flash',
        style: {
          top: this.opt.y ? `${this.opt.y}px` : null,
          left: this.opt.x ? `${this.opt.x}px` : null
        }
      },
      (this.elIcon = el('i', {
        class: ['fa', `fa-${this.opt.icon}`],
        style: {
          transform: `scale(${this.opt.scaleStart})`,
          opacity: this.opt.opacityStart,
          transition: `all ${this.opt.duration}ms ease-out`
        }
      }))
    );
    document.body.appendChild(this.elContainer);
  }

  flash() {
    setTimeout(this.activate.bind(this), 10);
  }
  activate() {
    //this.elIcon.style.fontSize = `${this.opt.endSize}px`;
    this.elIcon.style.transform = `scale(${this.opt.scaleEnd})`;
    this.elIcon.style.opacity = this.opt.opacityEnd;
    setTimeout(this.destroy.bind(this), this.opt.duration);
  }
  destroy() {
    this.elContainer.remove();
  }
}

export {IconFlash};
