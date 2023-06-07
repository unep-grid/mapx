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
    const userAuthenticated = tokenData.isValid && userData.isValid;

    const roles = userAuthenticated
      ? await getUserRoles(idUser, idProject)
      : {};


    /**
     * Store session data
     */
    socket.session = {};
    socket.session.user_authenticated = userAuthenticated;
    socket.session.user_roles = roles;
    socket.session.user_email = userData.email;
    socket.session.user_id = idUser;
    socket.session.project_id = idProject;

    next();
  } catch (e) {
    next(e);
  }
}
