import { getGeoInfo, getRealIp } from "#mapx/ip";
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

    const ip = getRealIp(handshake.headers, handshake.address);
    const ipGeo = await getGeoInfo(ip);

    // Validate the token
    const { key, isValid: isKeyValid } = await validateToken(userToken);

    // Validate the user
    const { email, isValid: isUserValid } = await validateUser(idUser, key);

    const userAuthenticated = isKeyValid && isUserValid;

    // Get user roles
    const roles = userAuthenticated
      ? await getUserRoles(idUser, idProject)
      : {};

    // Store session data on the socket object
    socket.session = {
      user_authenticated: userAuthenticated,
      user_roles: roles,
      user_email: email,
      user_id: idUser,
      project_id: idProject,
      origin: origin, // e.g. 'http://dev.mapx.localhost:8880'
      ip_geo: ipGeo, // {ip:'0.0.0.0',country_name:'xx',country_code:'xx',...}
    };

    // Populate socket data, for remote session object, e.g. multi user table editor
    Object.assign(socket.data, socket.session);

    // Proceed to the next middleware or handler
    next();
  } catch (error) {
    next(error);
  }
}
