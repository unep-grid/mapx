// @ts-check
import "./style.less";
import { ElementCreator } from "../../el/src/index.js";
import { shake } from "../../elshake/index.js";

const COLLAPSE_THRESHOLD = 7;
const WINDOW_SIZE = 5;

const ICONS = {
  quit: ["fa-sign-out", "fa-rotate-180"],
  "lock-toggle-locked": ["fa-lock"],
  "lock-toggle-unlocked": ["fa-unlock"],
  first: ["fa-fast-backward"],
  previous: ["fa-chevron-left"],
  next: ["fa-chevron-right"],
  last: ["fa-fast-forward"],
  "grid-toggle": ["fa-th"],
};

/**
 * Story map bottom navigation bar.
 * Presentational only: renders from `configure()`/setters and dispatches
 * CustomEvents for the host (story_map/index.js) to act on. Never imports
 * from story_map/index.js and never triggers navigation/lock itself.
 */
export class MxStoryNavigationElement extends HTMLElement {
  constructor() {
    super();
    /** @type {Record<string, HTMLElement>} */
    this.refs = {};
    this._built = false;
    this._steps = [];
    this._activeIndex = 0;
    this._locked = true;
    this._showQuit = true;
    this._gridOpen = false;
    this._aspectRatio = 1;
  }

  connectedCallback() {
    if (!this._built) this.build();
  }

  build() {
    this.elementCreator = new ElementCreator({ document: this.ownerDocument });
    const { el } = this.elementCreator;

    const quit = this.makeButton("quit", "Exit story");
    const lock = this.makeButton("lock-toggle", "Lock map");
    const first = this.makeButton("first", "First step");
    const previous = this.makeButton("previous", "Previous step");
    const bullets = el("div", { class: "mx-story-nav__bullets" });
    const next = this.makeButton("next", "Next step");
    const last = this.makeButton("last", "Last step");
    const grid = this.makeButton("grid-toggle", "All steps");

    const group = el(
      "div",
      { class: ["mx-story-nav__group", "noselect"] },
      quit,
      lock,
      first,
      previous,
      bullets,
      next,
      last,
      grid,
    );

    const bar = el("div", { class: "mx-story-nav__bar" }, group);
    const gridPanel = el("div", {
      class: ["mx-story-nav__grid", "mx-display-none"],
    });

    this.append(bar, gridPanel);

    this.refs = {
      bar,
      group,
      quit,
      lock,
      first,
      previous,
      bullets,
      next,
      last,
      grid,
      gridPanel,
    };

    group.addEventListener("click", (event) => this.onGroupClick(event));
    gridPanel.addEventListener("click", (event) => this.onGridClick(event));

    this._built = true;
    this.render();
  }

  /**
   * @param {string} action
   * @param {string} label
   */
  makeButton(action, label) {
    const { el } = this.elementCreator;
    const iconClasses =
      ICONS[action === "lock-toggle" ? "lock-toggle-locked" : action];
    const button = el(
      "button",
      {
        type: "button",
        class: ["mx-story-step-bullet", "mx-pointer", "shadow", "hint--top"],
        "aria-label": label,
        dataset: { navAction: action },
      },
      el("i", { class: ["fa", ...iconClasses], "aria-hidden": "true" }),
    );
    return button;
  }

  /**
   * @param {Object} config
   * @param {Array<{name?: string, text?: string, coverImageSrc?: string}>} [config.steps]
   * @param {number} [config.activeIndex]
   * @param {boolean} [config.locked]
   * @param {boolean} [config.showQuit]
   * @param {number} [config.aspectRatio]
   */
  configure(config = {}) {
    if (!this._built) this.build();
    if (config.steps) this._steps = config.steps;
    if (config.activeIndex !== undefined)
      this._activeIndex = config.activeIndex;
    if (config.locked !== undefined) this._locked = config.locked;
    if (config.showQuit !== undefined) this._showQuit = config.showQuit;
    if (Number.isFinite(config.aspectRatio) && config.aspectRatio > 0) {
      this._aspectRatio = config.aspectRatio;
    }
    this.render();
  }

  /** @param {number} index */
  setActiveIndex(index) {
    this._activeIndex = index;
    this._gridOpen = false;
    this.render();
  }

  /** @param {boolean} locked */
  setLocked(locked) {
    this._locked = locked;
    this.renderLock();
  }

  /**
   * Draw attention to the lock button (e.g. when the user clicks the
   * locked story overlay instead of the button itself).
   */
  shakeLock() {
    if (!this._built) return;
    shake(this.refs.lock, { type: "no_way" });
  }

  openGrid() {
    this._gridOpen = true;
    this.render();
  }

  closeGrid() {
    this._gridOpen = false;
    this.render();
  }

  getVisibleIndices() {
    const total = this._steps.length;
    if (total <= COLLAPSE_THRESHOLD) {
      return this._steps.map((_, i) => i);
    }
    const half = Math.floor(WINDOW_SIZE / 2);
    let start = Math.max(0, this._activeIndex - half);
    const end = Math.min(total - 1, start + WINDOW_SIZE - 1);
    start = Math.max(0, end - WINDOW_SIZE + 1);
    const indices = [];
    for (let i = start; i <= end; i++) indices.push(i);
    return indices;
  }

  render() {
    if (!this._built) return;
    const total = this._steps.length;
    const hasMultiple = total > 1;

    this.refs.quit.hidden = !this._showQuit;
    this.refs.first.hidden = !hasMultiple;
    this.refs.previous.hidden = !hasMultiple;
    this.refs.next.hidden = !hasMultiple;
    this.refs.last.hidden = !hasMultiple;
    this.refs.grid.hidden = total <= COLLAPSE_THRESHOLD;

    this.renderLock();

    this.refs.bullets.replaceChildren(
      ...this.getVisibleIndices().map((i) => this.makeStepBullet(i)),
    );

    this.refs.gridPanel.classList.toggle("mx-display-none", !this._gridOpen);
    if (this._gridOpen) {
      this.refs.gridPanel.style.setProperty(
        "--mx-story-preview-ratio",
        String(this._aspectRatio),
      );
      this.refs.gridPanel.replaceChildren(
        ...this._steps.map((_, i) => this.makeStepCard(i)),
      );
    }
  }

  renderLock() {
    if (!this._built) return;
    const icon = this.refs.lock.querySelector(".fa");
    const activeKey = this._locked
      ? "lock-toggle-locked"
      : "lock-toggle-unlocked";
    const inactiveKey = this._locked
      ? "lock-toggle-unlocked"
      : "lock-toggle-locked";
    icon.classList.remove(...ICONS[inactiveKey]);
    icon.classList.add(...ICONS[activeKey]);
    this.refs.lock.setAttribute(
      "aria-label",
      this._locked ? "Unlock map" : "Lock map",
    );
  }

  /** @param {number} index */
  makeStepBullet(index) {
    const { el } = this.elementCreator;
    const step = this._steps[index] || {};
    const label = step.name || `Step ${index + 1}`;
    const isActive = index === this._activeIndex;
    const tile = el(
      "button",
      {
        type: "button",
        class: ["mx-story-step-bullet", "mx-pointer", "shadow", "hint--top"],
        "aria-label": label,
        dataset: { step: index },
      },
      `${index + 1}`,
    );
    tile.classList.toggle("mx-story-step-active", isActive);
    return tile;
  }

  /** @param {number} index */
  makeStepCard(index) {
    const { el } = this.elementCreator;
    const step = this._steps[index] || {};
    const name = step.name?.trim() || "";
    const text = step.text?.trim() || "";
    const description = name || text;
    const accessibleDescription = description
      ? `: ${description.slice(0, 260)}`
      : "";
    const indexLabel = el("strong", {
      class: "mx-story-nav__card-index",
    });
    indexLabel.textContent = `${index + 1} – `;
    const label = el("div", { class: "mx-story-nav__card-label" }, indexLabel);

    if (name) {
      label.appendChild(el("strong", name));
    }
    if (text) {
      label.appendChild(el("p", text));
    }

    const cover = step.coverImageSrc
      ? el("img", {
          class: "mx-story-nav__card-cover",
          src: step.coverImageSrc,
          alt: "",
          loading: "lazy",
          "aria-hidden": "true",
        })
      : null;
    const card = el(
      "button",
      {
        type: "button",
        class: ["mx-story-nav__card", "mx-pointer", "shadow"],
        "aria-label": `Go to step ${index + 1}${accessibleDescription}`,
        dataset: { step: index },
      },
      cover,
      el("span", { class: "mx-story-nav__card-text" }, label),
    );
    card.classList.toggle("mx-story-step-active", index === this._activeIndex);
    card.classList.toggle(
      "mx-story-nav__card--with-cover",
      Boolean(step.coverImageSrc),
    );
    cover?.addEventListener(
      "error",
      () => {
        cover.remove();
        card.classList.remove("mx-story-nav__card--with-cover");
      },
      { once: true },
    );
    return card;
  }

  /** @param {MouseEvent} event */
  onGroupClick(event) {
    const target = /** @type {HTMLElement} */ (event.target);
    const tile = target.closest("[data-step]");
    if (tile) {
      this.dispatchNavEvent("mx-story-nav-goto", {
        to: Number(tile.dataset.step),
      });
      return;
    }
    const button = target.closest("[data-nav-action]");
    if (!button) return;
    this.onAction(button.dataset.navAction);
  }

  /** @param {MouseEvent} event */
  onGridClick(event) {
    const target = /** @type {HTMLElement} */ (event.target);
    const tile = target.closest("[data-step]");
    if (!tile) return;
    this.dispatchNavEvent("mx-story-nav-goto", {
      to: Number(tile.dataset.step),
    });
    this.closeGrid();
  }

  /** @param {string} action */
  onAction(action) {
    switch (action) {
      case "quit":
        this.dispatchNavEvent("mx-story-nav-quit");
        break;
      case "lock-toggle":
        this.dispatchNavEvent("mx-story-nav-lock-toggle");
        break;
      case "first":
        this.dispatchNavEvent("mx-story-nav-goto", { to: 0 });
        break;
      case "previous":
        this.dispatchNavEvent("mx-story-nav-goto", { to: "previous" });
        break;
      case "next":
        this.dispatchNavEvent("mx-story-nav-goto", { to: "next" });
        break;
      case "last":
        this.dispatchNavEvent("mx-story-nav-goto", {
          to: this._steps.length - 1,
        });
        break;
      case "grid-toggle":
        this._gridOpen ? this.closeGrid() : this.openGrid();
        break;
    }
  }

  /**
   * @param {string} type
   * @param {Object} [detail]
   */
  dispatchNavEvent(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
  }
}

if (!customElements.get("mx-story-navigation")) {
  customElements.define("mx-story-navigation", MxStoryNavigationElement);
}
