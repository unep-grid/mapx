export { ioConnect };

/**
 * Handle connect/disconnect
 * -> e.g. send authentication result
 * @param {Object} io socket.io instance
 * @return {Promise} done
 */
async function ioConnect(socket) {
  socket.emit("authentication", {
    authenticated: socket._mx_user_authenticated,
    roles: socket._mx_user_roles,
  });
}
