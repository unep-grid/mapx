import { defineConfig } from "vite";

export default defineConfig({
  server: {
    configureServer(server) {
      server.middlewares.use("/config.json", (_request, response) => {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(
          JSON.stringify({
            maintenanceEnd: (process.env.MAINTENANCE_END || "").trim(),
            mapTilerToken: (process.env.MAPTILER_TOKEN || "").trim(),
          }),
        );
      });
    },
  },
});
