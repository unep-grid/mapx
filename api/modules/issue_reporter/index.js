import { RateLimiter } from "#mapx/rate_limiter";
import { IssueReporter } from "./issue_reporter.js";

const rateLimiter = new RateLimiter({
  limit: 10,
  interval: 60 * 60 * 1e3,
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
    const id = `rate_issue_reporter_for_${socket.handshake.address}`;
    await rateLimiter.check(id, 1);
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
