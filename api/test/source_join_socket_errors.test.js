/* global describe, it */

import assert from "node:assert/strict";
import { ioSourceJoin } from "../modules/source/join/index.js";

describe("source join socket errors", () => {
  it("acknowledges failures and notifies the client", async () => {
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
      }
    );

    assert.equal(response, false);
    assert.deepEqual(notifications, [
      { message: "Unsupported method unsupported_test_method" },
    ]);
  });
});
