import { expect, it, vi } from "vitest";
const { cancelFrame, onNextFrame } = vi.hoisted(() => ({
  cancelFrame: vi.fn(),
  onNextFrame: vi.fn(() => 42),
}));
vi.mock("../animation_frame/index.js", () => ({ cancelFrame, onNextFrame }));
import { RadialProgress } from "./index.js";
it("uses the container document and cancels its last animation when destroyed", () => {
  const context = { scale: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  const root = document.createElement("div");
  const progress = new RadialProgress(root, {});
  expect(root.firstChild.ownerDocument).toBe(root.ownerDocument);
  progress.update(40);
  progress.destroy();
  expect(cancelFrame).toHaveBeenLastCalledWith(42);
  expect(root.children).toHaveLength(0);
  expect(window.rp).toBeUndefined();
  vi.restoreAllMocks();
});
it("clear() cancels a pending scheduled draw instead of letting it redraw afterwards", () => {
  const context = { scale: vi.fn(), clearRect: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
  const root = document.createElement("div");
  const progress = new RadialProgress(root, {});
  onNextFrame.mockReturnValueOnce(99);
  progress.update(0, "text");
  progress.clear();
  expect(cancelFrame).toHaveBeenCalledWith(99);
  expect(context.clearRect).toHaveBeenCalled();
  vi.restoreAllMocks();
});
