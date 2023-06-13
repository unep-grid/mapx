import {
  getLayerNamesByPrefix,
  getViews,
  getViewsListOpen,
  viewAdd,
  viewRemove,
  getMap,
  getViewTitle,
} from "./index.js";

const DEFAULT_OPTIONS = { run: 5, batch: 5, run_timeout: 20 * 1000 };

class ChaosTest {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.views = getViews();
    this.layersBefore = getLayerNamesByPrefix();
    this.viewsBefore = getViewsListOpen();
    this.map = getMap();
  }

  async start() {
    const ct = this;

    try {
      for (let i = 0; i < ct.options.run; i++) {
        console.log(`🏁 Run ${i} `);
        const promises = [];

        const ids = ct.getRandomViews(ct.options.batch);

        console.log("selected:", ids.map(getViewTitle));

        for (const id of ids) {
          promises.push(ct.t(id));
        }

        const promFail = ct.stopIfTimeout(ct.options.run_timeout, `Run ${i}`);
        const promOk = Promise.all(promises);

        await Promise.race([promOk, promFail]);
        await ct.wait(300);
        const valid = ct.valid();
        if (!valid) {
          throw new Error("🐞 Failed run ");
        } else {
          console.log(`✅ Run ${i} success `);
        }
      }

      console.log("chaos end");
      return true;
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
    const viewsAfter = getViewsListOpen();

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

  async stopIfTimeout(t, label) {
    const ct = this;
    await ct.wait(t);
    throw new Error(`⏱ Run Timeout after : + ${t * 1} ms. Label : ${label} `);
  }

  getRandomViews(n) {
    const ct = this;
    const choice = ct.views.map((v) => v.id);
    const select = [];
    for (let i = 0; i < n; i++) {
      if (choice.length < 1) {
        continue;
      }
      const pos = Math.floor(Math.random() * choice.length);
      const id = choice.splice(pos, 1)[0];
      select.push(id);
    }
    return select;
  }

  async t(idView) {
    const ct = this;
    const title = getViewTitle(idView);
    await ct.x(viewAdd(idView), `view add ${title}`);
    await ct.x(ct.map.once("idle"), `map idle ${title}`);
    await ct.x(ct.wait(ct.rt(1000)), `random time wait ${title}`);
    await ct.x(viewRemove(idView), `view remove ${title}`);
    return true;
  }

  wait(t) {
    return new Promise((r) => setTimeout(r, t || 100));
  }

  rt(t) {
    return Math.round(Math.random() * t);
  }

  async x(promise, label) {
    const ct = this;
    const to = ct.stopIfTimeout(3000, label);
    const r = Promise.race([promise, to]);
    return r;
  }
}

export { ChaosTest };
