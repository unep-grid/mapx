import { expect, it, vi } from "vitest";
const { action, canInteract } = vi.hoisted(() => ({
  action: vi.fn(),
  canInteract: vi.fn(),
}));
vi.mock("../mx.js", () => ({
  events: { fire: vi.fn() },
  settings: { project: { id: "B" } },
  project: { transition: { canInteract } },
}));
vi.mock("../is_test_mapx", () => ({
  isIconFont: () => false,
  isCanvas: () => false,
  isEmpty: (items) => items.length === 0,
}));
vi.mock("../icon_flash", () => ({ FlashCircle: class {} }));
vi.mock("./actions.js", () => ({ test_action: action }));
import { handleViewClick } from "./index.js";
it("rejects stale view actions at dispatch and accepts them after installation", () => {
  const target = document.createElement("button");
  target.dataset.view_action_handler = "test_action";
  const event = {
    target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  };
  canInteract.mockReturnValueOnce(false).mockReturnValueOnce(true);
  handleViewClick(event);
  expect(action).not.toHaveBeenCalled();
  expect(event.preventDefault).toHaveBeenCalledOnce();
  handleViewClick(event);
  expect(action).toHaveBeenCalledOnce();
  expect(canInteract).toHaveBeenCalledWith("B");
});
