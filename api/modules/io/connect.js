export { ioConnect };

/**
 * Handle connect/disconnect
 * -> e.g. send authentication result
 * @param {Object} io socket.io instance
 * @return {Promise} done
 */
async function ioConnect(socket) {
  const session = socket?.session;

  socket.emit("authentication", {
    authenticated: session?.user_authenticated,
    roles: session?.user_roles,
  });
}
