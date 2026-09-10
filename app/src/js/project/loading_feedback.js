import { ElementCreator } from "../el/src/index.js";
import { RadialProgress } from "../radial_progress/index.js";
import { tt } from "../el_mapx/index.js";
import "./switch.css";

/** One presentation for project initialization, downloading and rendering views. */
export class ProjectLoadingFeedback {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.el = new ElementCreator({ document: root.ownerDocument }).el;
    this.active = null;
    this.overlay = null;
  }

  /** @returns {symbol} An operation identity, never a project identifier. */
  begin() {
    this.active = Symbol("loading");
    clearTimeout(this.delay);
    clearTimeout(this.removal);
    this.sample = null;
    if (this.overlay) {
      this.restoreLoading();
      this.reveal(this.active);
    } else {
      this.delay = setTimeout(() => this.reveal(this.active), 150);
    }
    return this.active;
  }

  /** @param {symbol} token */
  reveal(token) {
    if (token !== this.active) {
      return;
    }
    if (!this.overlay) {
      this.host = this.root.querySelector(".mx-views-stage");
      this.content = this.host?.querySelector(".mx-views-list");
      if (!this.content) {
        return;
      }
      this.previousBusy = this.content.getAttribute("aria-busy");
      this.ringHost = this.el("div", { class: "mx-views-loading-ring" });
      this.label = this.el(
        "div",
        { role: "status", "aria-live": "polite" },
        tt("project_loading"),
      );
      this.overlay = this.el(
        "div",
        { class: "mx-views-loading-overlay" },
        this.ringHost,
        this.label,
      );
      this.host.append(this.overlay);
      this.ring = new RadialProgress(this.ringHost, {
        radius: 30,
        stroke: 4,
        addTrack: true,
        strokeColor: "#3399dd",
        trackColor: "rgba(128,128,128,0.35)",
      });
      // Resolve the theme at display time, including a newly installed theme.
      const color = this.root.ownerDocument.defaultView
        .getComputedStyle(this.root)
        .getPropertyValue("--mx_ui_link")
        .trim();
      if (color) {
        this.ring.opt.strokeColor = color;
      }
      this.overlay.getBoundingClientRect(); // Establish the initial opacity for the transition.
    }
    this.content.setAttribute("aria-busy", "true");
    this.overlay.classList.add("is-visible");
    this.overlay.classList.remove("is-error");
    this.paint();
  }

  restoreLoading() {
    this.ringHost.hidden = false;
    this.label.replaceChildren(tt("project_loading"));
    this.overlay.classList.remove("is-error");
  }

  /** @param {symbol} token @param {{loaded: number, total: number, lengthComputable: boolean}} data */
  update(token, data) {
    if (token !== this.active) {
      return;
    }
    this.sample =
      data?.lengthComputable &&
      Number.isFinite(data.total) &&
      data.total > 0 &&
      Number.isFinite(data.loaded) &&
      data.loaded >= 0 &&
      data.loaded <= data.total
        ? (data.loaded / data.total) * 100
        : null;
    this.paint();
  }

  /** @param {symbol} token */
  finishing(token) {
    if (token !== this.active) {
      return;
    }
    this.sample = null;
    this.paint();
  }

  paint() {
    if (!this.ring) {
      return;
    }
    if (this.sample === null) {
      this.ring.setIndeterminate();
    } else {
      this.ring.update(this.sample);
    }
  }

  /** @param {symbol} token */
  close(token) {
    if (token !== this.active) {
      return;
    }
    this.active = null;
    clearTimeout(this.delay);
    this.restoreBusy();
    if (!this.overlay) {
      return;
    }
    this.overlay.classList.remove("is-visible");
    this.removal = setTimeout(() => this.remove(), 120);
  }

  /** @param {symbol} token @param {null | (() => Promise<unknown>)} retry */
  fail(token, retry) {
    if (token !== this.active) {
      return;
    }
    clearTimeout(this.delay);
    this.reveal(token);
    if (!this.overlay) {
      return;
    }
    this.restoreBusy();
    this.overlay.classList.add("is-error");
    this.ring.setIndeterminate(false);
    this.ringHost.hidden = true;
    this.label.replaceChildren(
      tt(retry ? "project_switch_failed" : "project_switch_unknown"),
      this.el(
        "button",
        {
          type: "button",
          class: ["btn", "btn-default"],
          on: {
            click: () => {
              if (token !== this.active) {
                return;
              }
              if (retry) {
                void retry();
              } else {
                this.root.ownerDocument.defaultView.location.reload();
              }
            },
          },
        },
        tt(retry ? "project_switch_retry" : "project_switch_reload"),
      ),
    );
  }

  restoreBusy() {
    if (!this.content) {
      return;
    }
    if (this.previousBusy === null) {
      this.content.removeAttribute("aria-busy");
    } else {
      this.content.setAttribute("aria-busy", this.previousBusy);
    }
  }

  remove() {
    this.ring?.destroy();
    this.overlay?.remove();
    this.ring = null;
    this.overlay = null;
    this.content = null;
  }

  destroy() {
    this.active = null;
    clearTimeout(this.delay);
    clearTimeout(this.removal);
    this.restoreBusy();
    this.remove();
  }
}
