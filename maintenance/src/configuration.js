/**
 * Render immediately, then apply runtime configuration when available.
 * @param {object} options
 * @param {(date?: string) => void} options.renderMessages
 * @param {(token?: string) => unknown} options.startGlobe
 * @param {typeof fetch} [options.fetchConfiguration]
 * @param {number} [options.timeoutMs]
 */
export async function initializeMaintenance({
  renderMessages,
  startGlobe,
  fetchConfiguration = fetch,
  timeoutMs = 5000,
}) {
  renderMessages();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let configuration = {};
  try {
    const response = await fetchConfiguration("/config.json", {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error("Configuration unavailable");
    }
    const value = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Invalid configuration");
    }
    configuration = {
      maintenanceEnd:
        typeof value.maintenanceEnd === "string"
          ? value.maintenanceEnd.trim()
          : "",
      mapTilerToken:
        typeof value.mapTilerToken === "string"
          ? value.mapTilerToken.trim()
          : "",
    };
  } catch {
    // Keep the fallback message and omit the optional globe.
  } finally {
    clearTimeout(timer);
  }
  if (configuration.maintenanceEnd) {
    renderMessages(configuration.maintenanceEnd);
  }
  await startGlobe(configuration.mapTilerToken);
}
