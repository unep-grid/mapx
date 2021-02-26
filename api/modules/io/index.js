const {paramsValidator} = require('@mapx/route_validation');
const enableAuth = false;
/**
 * Handle connect/disconnect
 * @param {Object} io socket.io instance
 * @return {Function} middleware for connection
 */
module.exports.mwIoConnect = function(io) {
  return async (socket) => {
    io.on('disconnected', (socket) => {
      socket.emit('server_state', {
        type: 'message',
        msg: 'Disconected',
        id: socket.id
      });
    });

    socket.emit('server_state', {
      type: 'message',
      msg: 'Connected',
      id: socket.id
    });
    
    if (enableAuth) {
      /**
       * Handle query param validation
       */
      const authParams = ['idUser', 'idProject', 'token', 'isGuest'];
      const query = socket.handshake.query;
      const auth = {};
      authParams.forEach((k) => {
        try {
          auth[k] = JSON.parse(query[k]);
        } catch (e) {}
      });

      const validation = paramsValidator(auth, {
        expected: authParams
      });

      if (validation.ok && !auth.isGuest) {
        const tokenData = await validateToken(auth.token);
        const userData = await validateUser(auth.idUser, tokenData.key);
        /**
         * Handle user/token validation
         */
        auth.valid = tokenData.isValid && userData.isValid;
        if (auth.valid) {
          auth.isGuest = !auth.valid;
          socket.emit('server_state', {
            type: 'message',
            msg: 'Authentified!',
            id: 'authentication',
            data: {auth}
          });
          /** create user room **/
          socket.join(`user_${auth.idUser}`);
        }
      }
    }
  };
};
