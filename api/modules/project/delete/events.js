/**
 * Project delete protocol events.
 * Client counterpart : app/src/js/project/delete_channel.js
 */
export const events = {
  /**
   * from client
   */
  client_analyze: "/client/project/delete/analyze",
  client_start: "/client/project/delete/start",
  client_stop: "/client/project/delete/stop",
  client_commit: "/client/project/delete/commit",
  /**
   * from server
   */
  server_progress: "/server/project/delete/progress",
  server_rolled_back: "/server/project/delete/rolled_back",
  server_error: "/server/project/delete/error",
  server_done: "/server/project/delete/done",
};
