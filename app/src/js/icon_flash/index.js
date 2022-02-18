import {el} from './../el/src/index.js';
import './style.css';

const def = {
  icon: 'gears',
  text: '',
  duration: 800,
  removePrevious: true,
  scaleStart: 1,
  scaleEnd: 1.4,
  opacityStart: 0.2,
  opacityEnd: 0,
  x: null,
  y: null
};

let previous;

class FlashItem {
  constructor(opt) {
    const fi = this;
    if (typeof opt === 'string') {
      opt = {icon: opt};
    }
    opt = Object.assign({}, def, opt);
    if (previous && opt.removePrevious) {
      previous.destroy();
    }
    previous = this;
    fi.opt = opt;
    fi.build();
    fi.flash();
  }

  build() {
    const fi = this;
    fi.elFlash = el('i', {
      class: ['fa', `fa-${fi.opt.icon}`],
      style: {
        transform: `scale(${fi.opt.scaleStart})`,
        opacity: fi.opt.opacityStart,
        transition: `all ${fi.opt.duration}ms ease-out`
      }
    });
    if (fi.opt.text) {
      fi.elFlash.innerText = fi.opt.text;
      fi.elFlash.className = '';
    }

    fi.elContainer = el(
      'div',
      {
        class: 'icon-flash',
        style: {
          top: fi.opt.y ? `${fi.opt.y}px` : null,
          left: fi.opt.x ? `${fi.opt.x}px` : null
        }
      },
      fi.elFlash
    );
    document.body.appendChild(fi.elContainer);
  }

  flash() {
    const fi = this;
    setTimeout(fi.activate.bind(fi), 10);
  }
  activate() {
    const fi = this;
    fi.elFlash.style.transform = `scale(${fi.opt.scaleEnd})`;
    fi.elFlash.style.opacity = fi.opt.opacityEnd;
    setTimeout(fi.destroy.bind(fi), fi.opt.duration);
  }
  destroy() {
    const fi = this;
    fi.elContainer.remove();
  }
}

class FlashCircle extends FlashItem {
  constructor(opt) {
    super(
      Object.assign(
        {},
        {
          icon: 'circle-thin',
          duration: 600,
          scaleStart: 0.3,
          scaleEnd: 0.6,
          opacityStart: 0.05,
          opacityEnd: 0,
          x: null,
          y: null
        },
        opt
      )
    );
  }
}

export {FlashCircle, FlashItem, randomFlashItem};

function randomFlashItem(n) {
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
    new FlashItem({
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
