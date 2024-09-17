import { validateToken, validateUser, getUserRoles } from "./helpers.js";

/**
 * Middleware to validate and authenticate the user on socket connection.
 */
export async function ioMwAuthenticate(socket, next) {
  try {
    // Ensure the handshake object exists
    const { handshake } = socket;
    if (!handshake) {
      return next(new Error("Invalid socket handshake"));
    }

    const {
      auth: { idUser, idProject, token: userToken } = {},
      headers: { origin } = {},
    } = handshake;

    // Check for missing authentication information
    if (!idUser || !idProject || !userToken) {
      return next(new Error("Missing authentication information"));
    }

    // Validate the token
    const { key, isValid: isKeyValid } = await validateToken(userToken);

    if (!isKeyValid) {
      return next(new Error("Invalid token"));
    }

    // Validate the user
    const { email, isValid: isUserValid } = await validateUser(idUser, key);

    if (!isUserValid) {
      return next(new Error("Invalid user"));
    }

    // Get user roles
    const roles = await getUserRoles(idUser, idProject);

    // Store session data on the socket object
    socket.session = {
      user_authenticated: true,
      user_roles: roles,
      user_email: email,
      user_id: idUser,
      project_id: idProject,
      origin: origin,
    };

    // Proceed to the next middleware or handler
    next();
  } catch (error) {
    // Pass any errors to the next middleware
    next(error);
  }
}
