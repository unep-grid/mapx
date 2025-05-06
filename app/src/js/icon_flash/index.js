import { el } from "./../el/src/index.js";
import "./style.css";

const def = {
  icon: "gears",
  text: "",
  duration: 800,
  removePrevious: false,
  scaleStart: 1,
  scaleEnd: 1.4,
  opacityStart: 0.2,
  opacityEnd: 0,
  angle: 0,
  target: null,
  x: null,
  y: null,
};

let previous;

/**
 * Represents an item that flashes an icon and/or text.
 * @class
 * @param {object|string} opt - The options for the flash item. If a string is passed, it is treated as the `icon` option.
 * @param {string} [opt.icon='gears'] - The name of the Font Awesome icon to display.
 * @param {string} [opt.text=''] - The text to display next to the icon.
 * @param {number} [opt.angle=0] - The angle if the icon
 * @param {number} [opt.duration=800] - The duration of the flash animation in milliseconds.
 * @param {boolean} [opt.removePrevious=false] - Whether to remove the previous flash item before displaying the new one.
 * @param {number} [opt.scaleStart=1] - The starting scale of the icon.
 * @param {number} [opt.scaleEnd=1.4] - The ending scale of the icon.
 * @param {number} [opt.opacityStart=0.2] - The starting opacity of the icon.
 * @param {number} [opt.opacityEnd=0] - The ending opacity of the icon.
 * @param {number} [opt.x=null] - The horizontal position of the flash item in pixels. If null, the item will be centered horizontally.
 * @param {number} [opt.y=null] - The vertical position of the flash item in pixels. If null, the item will be centered vertically.
 */
class FlashItem {
  constructor(opt) {
    const fi = this;
    if (typeof opt === "string") {
      opt = { icon: opt };
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

  /**
   * Builds the DOM elements for the flash item.
   */
  build() {
    const fi = this;

    if (fi.opt.target) {
      Object.assign(fi.opt, fi.getCenter(fi.opt.target));
    }

    fi.elFlash = el("i", {
      class: ["fa", `fa-${fi.opt.icon}`],
      style: {
        transform: `scale(${fi.opt.scaleStart})`,
        opacity: fi.opt.opacityStart,
        transition: `all ${fi.opt.duration}ms ease-out`,
      },
    });
    if (fi.opt.text) {
      fi.elFlash.innerText = fi.opt.text;
      fi.elFlash.className = "";
    }

    fi.elContainer = el(
      "div",
      {
        class: "icon-flash",
        style: {
          transform: `rotateZ(${fi.opt.angle}deg)`,
          top: fi.opt.y ? `${fi.opt.y}px` : null,
          left: fi.opt.x ? `${fi.opt.x}px` : null,
        },
      },
      fi.elFlash,
    );
    document.body.appendChild(fi.elContainer);
    
  }

  getCenter(element) {
    const { x, y, height, width } = element.getBoundingClientRect();
    return {
      x: x + width / 2,
      y: y + height / 2,
    };
  }

  /**
   * Flashes the icon and/or text.
   */
  flash() {
    const fi = this;
    setTimeout(fi.activate.bind(fi), 10);
  }

  /**
   * Activates the flash animation.
   */
  activate() {
    const fi = this;
    fi.elFlash.style.transform = `scale(${fi.opt.scaleEnd})`;
    fi.elFlash.style.opacity = fi.opt.opacityEnd;
    setTimeout(fi.destroy.bind(fi), fi.opt.duration);
  }

  /**
   * Destroys the DOM elements for the flash item.
   */
  destroy() {
    const fi = this;
    fi.elContainer.remove();
  }
}

/**
 * Represents a circular flash item.
 * @class
 * @extends FlashItem
 * @param {object} opt - The options for the circular flash item.
 * @param {number} [opt.duration=600] - The duration of the flash animation in milliseconds.
 * @param {number} [opt.scaleStart=0.3] - The starting scale of the circle.
 * @param {number} [opt.scaleEnd=0.6] - The ending scale of the circle.
 * @param {number} [opt.opacityStart=0.05] - The starting opacity of the circle.
 * @param {number} [opt.opacityEnd=0] - The ending opacity of the circle.
 * @param {number} [opt.x=null] - The horizontal position of the flash item in pixels. If null, the item will be centered horizontally.
 * @param {number} [opt.y=null] - The vertical position of the flash item in pixels. If null, the item will be centered vertically.
 */
class FlashCircle extends FlashItem {
  constructor(opt) {
    super(
      Object.assign(
        {},
        {
          icon: "circle-thin",
          duration: 600,
          scaleStart: 0.3,
          scaleEnd: 0.6,
          opacityStart: 0.05,
          opacityEnd: 0,
          x: null,
          y: null,
        },
        opt,
      ),
    );
  }
}

export { FlashCircle, FlashItem, randomFlashItem };

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
      icon: "circle-o",
      x: random(0, r.width),
      y: random(0, r.height),
      scaleStart: random(0.2, 2),
      scaleEnd: random(2, 4),
      opacityStart: random(0.2, 0.5),
      opacityEnd: random(0.2, 0.5),
    });
  }
  function random(min, max) {
    return Math.random() * (max - min) + min;
  }
}
