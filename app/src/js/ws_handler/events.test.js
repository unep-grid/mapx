import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  triggerUpdateSourcesList: vi.fn(),
}));

vi.mock("../map_helpers/index.js", () => ({
  getViewRemote: vi.fn(),
  triggerUpdateSourcesList: mocks.triggerUpdateSourcesList,
  viewsReplace: vi.fn(),
}));

vi.mock("../views_list_manager", () => ({
  viewsListAddSingle: vi.fn(),
}));

vi.mock("../style_vt/index.js", () => ({
  getViewMapboxStyle: vi.fn(),
  getViewSldStyle: vi.fn(),
}));

vi.mock("../app_utils", () => ({
  isProd: vi.fn(),
}));

vi.mock("../mx.js", () => ({
  nc: { notify: vi.fn() },
}));

vi.mock("../mx_helper_misc.js", () => ({
  clone: vi.fn((value) => value),
}));

vi.mock("../source/joins/index.js", () => ({
  sjm_instances: [],
}));

import { eventsHandlers } from "./events.js";

describe("WebSocket source-added event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates source lists without requiring an acknowledgement callback", async () => {
    await expect(
      eventsHandlers["/server/source/added"]({
        idSource: "mx_vector_a_b_c_d_e",
      }),
    ).resolves.toBeUndefined();

    expect(mocks.triggerUpdateSourcesList).toHaveBeenCalledOnce();
  });

  it("acknowledges response-aware emitters", async () => {
    const callback = vi.fn();
    const data = { idSource: "mx_vector_a_b_c_d_e" };

    await eventsHandlers["/server/source/added"](data, callback);

    expect(callback).toHaveBeenCalledWith(data);
  });
});
