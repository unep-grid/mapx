import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProjectLoadingFeedback } from "./loading_feedback.js";
const { rings } = vi.hoisted(() => ({ rings: [] }));
vi.mock("../radial_progress/index.js", () => ({
  RadialProgress: class {
    constructor() {
      this.opt = {};
      rings.push(this);
    }
    update = vi.fn();
    setIndeterminate = vi.fn();
    destroy = vi.fn();
  },
}));
vi.mock("../el_mapx/index.js", () => ({
  tt: (key) => {
    const span = document.createElement("span");
    span.dataset.lang_key = key;
    span.textContent = key;
    return span;
  },
}));
let root, feedback, list;
beforeEach(() => {
  vi.useFakeTimers();
  rings.length = 0;
  root = document.createElement("main");
  root.innerHTML =
    '<header>Project</header><button>Tools</button><div class="mx-views-stage"><div class="mx-views-list"><p>Existing view</p></div></div>';
  document.body.append(root);
  list = root.querySelector(".mx-views-list");
  feedback = new ProjectLoadingFeedback(root);
});
afterEach(() => {
  feedback.destroy();
  root.remove();
  vi.useRealTimers();
});
it("does not mount feedback for a fast operation", async () => {
  feedback.close(feedback.begin());
  await vi.advanceTimersByTimeAsync(300);
  expect(root.querySelector(".mx-views-loading-overlay")).toBeNull();
  expect(rings).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
});
it("keeps one overlay across unmeasurable, measured and finishing phases", async () => {
  const token = feedback.begin();
  await vi.advanceTimersByTimeAsync(150);
  const overlay = feedback.overlay;
  expect(rings[0].setIndeterminate).toHaveBeenCalled();
  feedback.update(token, { loaded: 5, total: 10, lengthComputable: true });
  expect(rings[0].update).toHaveBeenCalledWith(50);
  feedback.finishing(token);
  expect(rings[0].setIndeterminate).toHaveBeenCalledTimes(2);
  expect(feedback.overlay).toBe(overlay);
  expect(list.getAttribute("aria-busy")).toBe("true");
  expect(list.firstChild.textContent).toBe("Existing view");
  expect(root.querySelector("header").textContent).toBe("Project");
  feedback.close(token);
  expect(list.hasAttribute("aria-busy")).toBe(false);
  await vi.advanceTimersByTimeAsync(120);
  expect(overlay.isConnected).toBe(false);
  expect(rings[0].destroy).toHaveBeenCalledOnce();
});
it("ignores stale progress and cancels removal when another operation starts", async () => {
  const old = feedback.begin();
  await vi.advanceTimersByTimeAsync(150);
  const overlay = feedback.overlay;
  feedback.close(old);
  await vi.advanceTimersByTimeAsync(60);
  const current = feedback.begin();
  feedback.update(old, { loaded: 10, total: 10, lengthComputable: true });
  feedback.close(old);
  await vi.advanceTimersByTimeAsync(200);
  expect(feedback.overlay).toBe(overlay);
  expect(rings).toHaveLength(1);
  expect(rings[0].update).not.toHaveBeenCalled();
  expect(list.getAttribute("aria-busy")).toBe("true");
  feedback.close(current);
});
it("falls back to spinning for unknown or inconsistent quantities", async () => {
  const token = feedback.begin();
  await vi.advanceTimersByTimeAsync(150);
  for (const sample of [
    { loaded: 1, total: 1, lengthComputable: false },
    { loaded: 12, total: 10, lengthComputable: true },
  ]) {
    feedback.update(token, sample);
  }
  expect(rings[0].update).not.toHaveBeenCalled();
});
it("removes blur and offers recovery in place without trapping focus", async () => {
  const tool = root.querySelector("button");
  tool.focus();
  const token = feedback.begin();
  const retry = vi.fn();
  feedback.fail(token, retry);
  expect(feedback.overlay.classList.contains("is-error")).toBe(true);
  expect(document.activeElement).toBe(tool);
  expect(root.inert).not.toBe(true);
  expect(list.hasAttribute("aria-busy")).toBe(false);
  feedback.overlay.querySelector("button").click();
  expect(retry).toHaveBeenCalledOnce();
  expect(root.querySelector('[role="dialog"]')).toBeNull();
  expect(root.textContent).not.toContain("MX-");
});
