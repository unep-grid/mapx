/**
 * Class to handle moving an element with different animation effects.
 *
 * @example
 * const mover = new ElementMover(document.getElementById('myElement'));
 * mover.move({ left: '100px', top: '200px' }, 300, 'ease-out');
 */
export class ElementMover {
  /**
   * Creates an instance of ElementMover.
   * @param {HTMLElement} el - The element to be moved.
   */
  constructor(el) {
    this.el = el;
    this.initialStyle = getComputedStyle(el);
  }

  /**
   * Moves the element to a new position by applying the specified CSS styles.
   * @param {Object} style - The CSS styles to be applied to the element.
   * @param {number} [duration=300] - The duration of the animation in milliseconds.
   * @param {string} [effect='bounce'] - The animation effect ('bounce', 'linear', 'ease-in', 'ease-out').
   * @returns {void}
   */
  to(style, duration = 300, effect = "bounce") {
    if (this.el._move_el) {
      return;
    }
    this.el._move_el = true;

    // Apply initial styles
    for (const key in style) {
      this.el.style[key] = this.initialStyle[key];
    }

    // Set transition based on the effect
    let transitionEffect;
    switch (effect) {
      case "linear":
        transitionEffect = "linear";
        break;
      case "ease-in":
        transitionEffect = "ease-in";
        break;
      case "ease-out":
        transitionEffect = "ease-out";
        break;
      case "bounce":
      default:
        transitionEffect = "cubic-bezier(0.68, -0.6, 0.32, 1.6)";
        break;
    }
    this.el.style.transition = `all ${duration}ms ${transitionEffect}`;

    // Apply new styles
    for (const key in style) {
      this.el.style[key] = style[key];
    }

    // Clean up after the transition is done
    setTimeout(() => {
      this.el.style.transition = "";
      delete this.el._move_el;
    }, duration);
  }
}
