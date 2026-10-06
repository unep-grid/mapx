import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserRoles, sendError, validateToken, validateUser } = vi.hoisted(
  () => ({
    getUserRoles: vi.fn(),
    sendError: vi.fn(),
    validateToken: vi.fn(),
    validateUser: vi.fn(),
  }),
);

vi.mock("#mapx/helpers", () => ({ sendError }));
vi.mock("./helpers.js", () => ({
  getUserRoles,
  isUserRoot: vi.fn(),
  validateToken,
  validateUser,
}));

import { validateRoleHandlerFor, validateTokenHandler } from "./mw.js";

describe("HTTP authentication middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a member when the publisher role is required", async () => {
    getUserRoles.mockResolvedValueOnce({ member: true, publisher: false });
    const next = vi.fn();
    const req = { body: { idUser: "2", idProject: "MX-AAA-BBB-CCC-DDD-EEE" } };

    await validateRoleHandlerFor("publisher")(req, {}, next);

    expect(getUserRoles).toHaveBeenCalledWith("2", "MX-AAA-BBB-CCC-DDD-EEE");
    expect(sendError).toHaveBeenCalledWith({}, expect.any(Object), 403);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it("accepts a publisher when the publisher role is required", async () => {
    getUserRoles.mockResolvedValueOnce({ member: true, publisher: true });
    const next = vi.fn();

    await validateRoleHandlerFor("publisher")(
      { body: { idUser: "2", project: "MX-AAA-BBB-CCC-DDD-EEE" } },
      {},
      next,
    );

    expect(sendError).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects an invalid token", async () => {
    validateToken.mockResolvedValueOnce({ isValid: false, key: "k" });
    validateUser.mockResolvedValueOnce({ isValid: true, email: "a@b.c" });
    const next = vi.fn();
    vi.spyOn(console, "log").mockImplementationOnce(() => {});

    await validateTokenHandler({ body: { idUser: 2, token: "x" } }, {}, next);

    expect(sendError).toHaveBeenCalledWith({}, expect.any(Object), 403);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
