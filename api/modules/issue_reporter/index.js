import { RateLimiter } from "#mapx/io";
import { IssueReporter } from "./issue_reporter.js";
const isDev = true;

const rateLimiter = new RateLimiter({
  limit: 4,
  interval: isDev ? 60 * 1e3 : 60 * 60 * 1e3,
  dev: isDev,
});

/**
 * Socket.io middleware to handle issue report emails.
 * @param {Object} socket - The socket instance.
 * @param {Object} data - The data payload from the client.
 * @param {Function} cb - The callback function.
 */
export async function ioIssueReport(socket, data, cb) {
  try {
    const { session } = socket;
    await rateLimiter.check(socket.handshake.address, 1);
    const reporter = new IssueReporter(data, session);
    await reporter.send();
    cb({ ok: true });
  } catch (e) {
    cb({
      type: "error",
      message: e?.message || e,
      ok: false,
    });
  }
}
