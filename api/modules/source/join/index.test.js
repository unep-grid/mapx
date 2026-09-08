import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

vi.mock("#mapx/db_utils", () => ({
  withTransaction: vi.fn(),
}));

vi.mock("./schema.js", () => ({
  getSchema: vi.fn(),
}));

vi.mock("./validator.js", () => ({
  validator: { validate: vi.fn() },
}));

vi.mock("./helpers.js", () => ({
  getJoinConfig: vi.fn(),
  getJoinData: vi.fn(),
  msg: (message) => message,
  getCount: vi.fn(),
  getColumnsType: vi.fn(),
  getPreview: vi.fn(),
  getColumnsMissingInJoin: vi.fn(),
  setJoinConfig: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
}));

import { ioSourceJoin } from "./index.js";

describe("source join socket errors", () => {
  it("acknowledges failures and notifies the client", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const notifications = [];
    let response;
    const socket = {
      session: {
        user_authenticated: true,
        user_roles: { developer: true },
      },
      async notifyInfoError(notification) {
        notifications.push(notification);
      },
    };

    await ioSourceJoin(
      socket,
      { method: "unsupported_test_method", config: {} },
      (value) => {
        response = value;
      },
    );

    expect(response).toBe(false);
    expect(notifications).toEqual([
      { message: "Unsupported method unsupported_test_method" },
    ]);
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
