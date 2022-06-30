import { settings } from "./../settings";

/**
 * Get url for service
 * @param {String} id Id of service : api, search .. .
 * @param {String} route Additional route id, if exists in config
 * @return {String} url
 */
export function getServiceUrl(id, route) {
  const s = settings;
  const service = s[id];
  if (location.protocol === "https:") {
    service.protocol = "https:";
  }
  /**
   * ⚠️  Can't use URL api: templating,e.g. {x}/{y}/{z} is not supported
   */
  const url = `${service.protocol}//${service.host_public}:${service.port_public}`;

  if (!route) {
    return url;
  }
  route = service.routes[route] || route;
  return `${url}${route}`;
}

/**
 * Get api route by id
 * @param {String} id Route id 
 */
export function getApiRoute(id) {
  const s = settings;
  return s.api.routes[id] || "/";
}

/**
 * API route resolver
 * @return {URL} api url + route
 */
export function getApiUrl(route) {
  return getServiceUrl("api", route);
}

/**
 * Search URL
 * @return {URL} search url;
 */
export function getSearchUrl() {
  return getServiceUrl("search");
}

/**
 * Set mapx API host info when started without server app
 */
const regexDefaultSubDomain = new RegExp(/^(app|dev)\..*\.[a-z]{1,}$/);
export function setApiUrlAuto() {
  const loc = new URL(window.location.href);
  const hasDefaultSubDomain = regexDefaultSubDomain.test(loc.hostname);
  /**
   * Use settings default or,
   * if has default subdomain, webpack variables OR
   * modified url based on standard
   */
  if (hasDefaultSubDomain) {
    /**
     * If no webpack variables found, replace by defaults
     */
    const apiHost =
      typeof API_HOST_PUBLIC === "undefined"
        ? loc.hostname.replace(/^(app|dev)\./, "api.")
        : API_HOST_PUBLIC;
    const apiPortPublic =
      typeof API_PORT_PUBLIC === "undefined" ? loc.port : API_PORT_PUBLIC;

    /**
     * Set API url based on current location
     */
    Object.assign(settings.api, {
      host_public: apiHost,
      protocol: loc.protocol,
      port_public: apiPortPublic,
    });
  }
}

/**
 * Get url for path relative to the app
 * @param {String} id Id of the path : sprite, download, etc
 * @return {String}
 */
export function getAppPathUrl(id) {
  /**
   * mapbox requires templates such as /fontstack/{range} : this prevents
   * from using URL API. Using templates litterals instead.
   */
  return `${window.location.origin}/${settings.paths[id]}`;
}
