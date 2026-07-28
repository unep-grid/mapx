import { describe, expect, it, vi } from "vitest";

const {
  getGeoInfo,
  getRealIp,
  getUserRoles,
  validateToken,
  validateUser,
} = vi.hoisted(() => ({
  getGeoInfo: vi.fn(),
  getRealIp: vi.fn(),
  getUserRoles: vi.fn(),
  validateToken: vi.fn(),
  validateUser: vi.fn(),
}));

vi.mock("#mapx/ip", () => ({
  getGeoInfo,
  getRealIp,
}));
vi.mock("./helpers.js", () => ({
  getUserRoles,
  validateToken,
  validateUser,
}));

import { ioMwAuthenticate } from "./io_mw.js";

describe("Socket.IO authentication middleware", () => {
  it("preserves the validated guest identity in the server session", async () => {
    getRealIp.mockReturnValueOnce("192.0.2.1");
    getGeoInfo.mockResolvedValueOnce({ country: "CH" });
    validateToken.mockResolvedValueOnce({
      isGuest: true,
      isValid: true,
      key: "guest-key",
    });
    validateUser.mockResolvedValueOnce({
      email: null,
      isValid: true,
    });
    getUserRoles.mockResolvedValueOnce({});
    const socket = {
      data: {},
      handshake: {
        address: "192.0.2.1",
        auth: {
          idProject: "MX-TEST",
          idUser: 1,
          token: "guest-token",
        },
        headers: { origin: "https://example.test" },
      },
    };
    const next = vi.fn();

    await ioMwAuthenticate(socket, next);

    expect(socket.session).toMatchObject({
      user_authenticated: true,
      user_id: 1,
      user_is_guest: true,
    });
    expect(socket.data.user_is_guest).toBe(true);
    expect(next).toHaveBeenCalledWith();
  });
});
