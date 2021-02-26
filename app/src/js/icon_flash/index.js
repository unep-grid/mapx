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

class ButtonCircle extends IconFlash {
  constructor(opt) {
    super(Object.assign({},{
      icon: 'circle-thin',
      duration: 600,
      scaleStart: 0.3,
      scaleEnd: 0.6,
      opacityStart: 0.05,
      opacityEnd: 0,
      x: null,
      y: null
    },opt));
  }
}

export {ButtonCircle, IconFlash, randomFlashIcon};

function randomFlashIcon(n) {
  var r = document.body.getBoundingClientRect();
  var iter = 10;

  next();

  function next() {
    generate();
    if (iter-- > 0) {
      setTimeout(next, 1000);
    }
  }
  function generate() {
    var m = n || 10;
    while (m-- > 0) {
      setTimeout(draw, random(0, 1000));
    }
  }
  function draw() {
    new IconFlash({
      icon: 'circle-o',
      x: random(0, r.width),
      y: random(0, r.height),
      scaleStart: random(0.2, 2),
      scaleEnd: random(2, 4),
      opacityStart: random(0.2, 0.5),
      opacityEnd: random(0.2, 0.5)
    });
  }
  function random(min, max) {
    return Math.random() * (max - min) + min;
  }
}
