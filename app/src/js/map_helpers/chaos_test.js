import {
  getLayerNamesByPrefix,
  getViews,
  getViewsOpen,
  viewAdd,
  viewRemove,
  getMap,
} from "./index.js";

const DEFAULT_OPTIONS = { run: 5, batch: 5, run_timeout: 10 * 1000 };

class ChaosTest {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.views = getViews();
    this.layersBefore = getLayerNamesByPrefix();
    this.viewsBefore = getViewsOpen();
    this.map = getMap();
  }

  async start() {
    const ct = this;
    try {
      for (let i = 0; i < ct.options.run; i++) {
        const promises = [];

        for (let j = 0; j < ct.options.batch; j++) {
          promises.push(ct.t());
        }

        const promOk = Promise.all(promises);
        const promFail = ct.stopIfTimeout(ct.options.run_timeout);

        await Promise.race([promOk, promFail]);
        await ct.wait(300);
      }

      return ct.valid();
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  /**
   * Helpers
   */

  valid() {
    const ct = this;

    const layersAfter = getLayerNamesByPrefix();
    const viewsAfter = getViewsOpen();

    const validLN = ct.layersBefore.length === layersAfter.length;
    const validVN = ct.viewsBefore.length === viewsAfter.length;

    if (!validLN || !validVN) {
      return false;
    }

    const hasLayers = ct.layersBefore.every((layer) =>
      layersAfter.includes(layer)
    );
    const hasViews = ct.viewsBefore.every((view) => viewsAfter.includes(view));

    if (!hasLayers || !hasViews) {
      return false;
    }

    return true;
  }

  async stopIfTimeout(t) {
    const ct = this;
    await ct.wait(t);
    throw new Error(`Run Timeout after : + ${t * 1} ms`);
  }

  async t() {
    const ct = this;
    const pos = Math.floor(Math.random() * ct.views.length);
    const view = ct.views[pos];
    await viewAdd(view);
    await ct.map.once('idle');
    await ct.wait(ct.rt(1000));
    await viewRemove(view);
  }

  wait(t) {
    return new Promise((r) => setTimeout(r, t || 100));
  }

  rt(t) {
    return Math.round(Math.random() * t);
  }
}

export { ChaosTest };
