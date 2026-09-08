import express from "express";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfiguration } from "./configuration.js";

const projectDirectory = fileURLToPath(new URL(".", import.meta.url));
const serviceWorker = readFileSync(
  new URL("./service-worker.js", import.meta.url),
  "utf8",
);

const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.maptiler.com https://*.maptiler.com",
    "worker-src 'self' blob:",
    "child-src blob:",
  ].join("; "),
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Configuration is fixed at startup for each server instance.
 * @param {object} [options]
 * @param {ReturnType<typeof resolveConfiguration>} [options.configuration]
 * @param {import("express").RequestHandler} [options.frontend]
 * @param {string} [options.staticDirectory]
 * @returns {import("node:http").Server}
 */
export function createMaintenanceServer({
  configuration = resolveConfiguration(),
  frontend,
  staticDirectory = resolve(projectDirectory, "dist"),
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.disable("etag");
  app.enable("strict routing");
  app.enable("case sensitive routing");
  app.use((_request, response, next) => {
    response.set(securityHeaders).set("Cache-Control", "no-store");
    next();
  });
  app.all("/healthz", (_request, response) =>
    response.type("text").send("ok\n"),
  );
  app.use((request, response, next) => {
    const hostname = (request.headers.host || "")
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, "");
    if (!hostname.startsWith(configuration.apiHostPrefix)) {
      return next();
    }
    const retry = configuration.maintenanceEnd || null;
    const seconds = Math.ceil((Date.parse(retry) - Date.now()) / 1000);
    if (seconds > 0) {
      response.set("Retry-After", String(seconds));
    }
    response.status(503).json({
      error: "MapX is temporarily unavailable for scheduled maintenance.",
      retry,
    });
  });
  app.use((request, response, next) => {
    if (request.method === "GET" || request.method === "HEAD") {
      return next();
    }
    response
      .set("Allow", "GET, HEAD")
      .status(405)
      .type("text")
      .send("Method not allowed");
  });
  app.get("/service-worker.js", (_request, response) => {
    response.set("Service-Worker-Allowed", "/").type("js").send(serviceWorker);
  });
  app.get("/config.json", (_request, response) => {
    response.json({
      maintenanceEnd: configuration.maintenanceEnd,
      mapTilerToken: configuration.mapTilerToken,
    });
  });
  app.use(
    frontend ||
      express.static(staticDirectory, {
        redirect: false,
        fallthrough: false,
        etag: false,
        lastModified: false,
        setHeaders(response, filePath) {
          const assetPath = filePath
            .slice(staticDirectory.length)
            .replaceAll("\\", "/");
          response.setHeader(
            "Cache-Control",
            /^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[^/]+$/.test(assetPath)
              ? "public, max-age=31536000, immutable"
              : "no-store",
          );
        },
      }),
  );
  app.use((_request, response) =>
    response.status(404).type("text").send("Not found"),
  );
  /** @type {import("express").ErrorRequestHandler} */
  const handleError = (error, _request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }
    const status =
      error.status >= 400 && error.status < 500 ? error.status : 500;
    response
      .status(status)
      .type("text")
      .send(
        status === 500
          ? "Internal server error"
          : status === 404
            ? "Not found"
            : "Bad request",
      );
  };
  app.use(handleError);
  return createServer(app);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createMaintenanceServer();
  const port = Number.parseInt(process.env.PORT || "8080", 10);
  server.listen(port, "0.0.0.0", () => {
    console.log(`MapX maintenance server listening on port ${port}`);
  });
}
