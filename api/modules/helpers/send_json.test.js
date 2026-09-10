import { expect, it, vi } from "vitest";
vi.mock("#root/settings", () => ({ settings: {} }));
import { sendJSON } from "./index.js";
it.each([false, true])(
  "reports UTF-8 bytes including optional delimiters (%s)",
  (toRes) => {
    const res = { setHeader: vi.fn(), send: vi.fn() };
    sendJSON(res, { title: "Forêt 🌳 中文" }, { toRes });
    const payload = res.send.mock.calls[0][0];
    expect(res.setHeader).toHaveBeenCalledWith(
      "Mapx-Content-Length",
      Buffer.byteLength(payload, "utf8"),
    );
  },
);
it("does not invent a total for a response sent in multiple writes", () => {
  const res = { setHeader: vi.fn(), write: vi.fn() };
  sendJSON(res, { part: 1 }, { end: false });
  expect(
    res.setHeader.mock.calls.some(([key]) => key === "Mapx-Content-Length"),
  ).toBe(false);
});
