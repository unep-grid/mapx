import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL(".", import.meta.url));
const staticDirectory = resolve(projectDirectory, "dist");
const port = Number.parseInt(process.env.PORT || "8080", 10);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

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

function send(response, statusCode, body, contentType) {
  response.writeHead(statusCode, {
    ...securityHeaders,
    "Cache-Control": "no-store",
    "Content-Type": contentType,
  });
  response.end(body);
}

function getConfig() {
  return JSON.stringify({
    maintenanceEnd: (process.env.MAINTENANCE_END || "").trim(),
    mapTilerToken: (process.env.MAPTILER_TOKEN || "").trim(),
  });
}

function isInsideStaticDirectory(filePath) {
  return (
    filePath === staticDirectory || filePath.startsWith(`${staticDirectory}${sep}`)
  );
}

function getStaticCacheControl(pathname) {
  const isFingerprintedAsset =
    /^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.[^/]+$/.test(pathname);
  return isFingerprintedAsset
    ? "public, max-age=31536000, immutable"
    : "no-store";
}

async function serveStaticFile(response, pathname) {
  const relativePath = normalize(pathname === "/" ? "/index.html" : pathname);
  const filePath = resolve(join(staticDirectory, `.${relativePath}`));

  if (!isInsideStaticDirectory(filePath)) {
    send(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      send(response, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }

    response.writeHead(200, {
      ...securityHeaders,
      "Cache-Control": getStaticCacheControl(pathname),
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    if (error.code === "ENOENT") {
      send(response, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    send(response, 500, "Internal server error", "text/plain; charset=utf-8");
  }
}

export function createMaintenanceServer() {
  return createServer(async (request, response) => {
    let requestUrl;
    try {
      requestUrl = new URL(request.url || "/", "http://localhost");
    } catch {
      send(response, 400, "Bad request", "text/plain; charset=utf-8");
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      send(response, 405, "Method not allowed", "text/plain; charset=utf-8");
      return;
    }

    if (requestUrl.pathname === "/healthz") {
      send(response, 200, "ok\n", "text/plain; charset=utf-8");
      return;
    }

    if (requestUrl.pathname === "/config.json") {
      send(response, 200, getConfig(), contentTypes[".json"]);
      return;
    }

    await serveStaticFile(response, requestUrl.pathname);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createMaintenanceServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(`MapX maintenance server listening on port ${port}`);
  });
}
