import { createAdapter } from "@socket.io/redis-adapter";
import { clientRedis, clientRedisAlt } from "#mapx/db";
import { settings } from "#root/settings";

export function ioCreateAdapter() {
  return createAdapter(clientRedis, clientRedisAlt, {
    publishOnSpecificResponseChannel: true,
    key: settings.socket_io.keys.redis_main,
    requestsTimeout: 5000,
  });
}
