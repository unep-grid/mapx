import { validateToken, validateUser, getUserRoles } from "./helpers.js";

/**
 * Validate / authenticate user on connect
 */
export async function ioMwAuthenticate(socket, next) {
  try {
    /**
     * Get auth info
     */
    const idUser = socket.handshake.auth.idUser;
    const idProject = socket.handshake.auth.idProject;
    const userToken = socket.handshake.auth.token;
    /**
     * Validate token
     */
    const tokenData = await validateToken(userToken);
    const key = tokenData?.key;
    /**
     * Validate user
     */
    const userData = await validateUser(idUser, key);

    /**
     * Handle validation
     */
    socket._mx_user_authenticated = tokenData.isValid && userData.isValid;

    if (socket._mx_user_authenticated) {
      socket._mx_user_roles = await getUserRoles(idUser, idProject);
    } else {
      socket._mx_user_roles = {};
    }

    next();
  } catch (e) {
    next(e);
  }
}
