import { createServer as createViteServer, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { createMaintenanceServer } from "./server.js";
import { resolveConfiguration } from "./configuration.js";

/**
 * Create production routes with Vite development assets and hot reload.
 * @param {{environment?: Record<string, string | undefined>, mode?: string}} [options]
 * @returns {Promise<import("node:http").Server>}
 */
export async function createDevelopmentServer({
  environment = process.env,
  mode = "development",
} = {}) {
  const root = fileURLToPath(new URL(".", import.meta.url));
  const configuration = resolveConfiguration(
    environment,
    loadEnv(mode, root, ""),
  );
  let vite;
  const server = createMaintenanceServer({
    configuration,
    frontend: (request, response, next) =>
      vite.middlewares(request, response, next),
  });
  vite = await createViteServer({
    root,
    mode,
    appType: "mpa",
    server: { middlewareMode: true, hmr: { server } },
  });
  server.on("close", () => {
    void vite.close();
  });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await createDevelopmentServer();
  const port = Number.parseInt(process.env.PORT || "8080", 10);
  server.listen(port, "0.0.0.0", () => {
    console.log(
      `MapX maintenance development server listening on port ${port}`,
    );
  });
}
