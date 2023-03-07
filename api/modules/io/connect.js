/**
 * Handle connect/disconnect
 * -> e.g. send authentication result
 * @param {Object} io socket.io instance
 * @return {Promise} done
 */
export async function ioConnect(socket) {
  const session = socket?.session;

  socket.emit("authentication", {
    authenticated: session?.user_authenticated,
    roles: session?.user_roles,
  });
}

/**
 * Wrapper for routing
 * @param {Function} handler Handler for the event
 * @return {Function} wrapped function
 */
export function use(handler) {
  return function (request, callback) {
    const socket = this;
    return handler(socket, request, callback);
  };
}
