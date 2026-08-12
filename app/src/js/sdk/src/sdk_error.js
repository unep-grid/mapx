/**
 * Error returned when an SDK request cannot be completed.
 */
export class MapxSdkError extends Error {
  /**
   * @param {Object} options Error details
   * @param {String} options.code Stable machine-readable error code
   * @param {String} options.message Human-readable error message
   * @param {Number|null} [options.idRequest] Request identifier
   * @param {String|null} [options.idResolver] Resolver identifier
   * @param {*} [options.detail] Optional resolver error details
   */
  constructor(options = {}) {
    const {
      code = "sdk_request_failed",
      message = "MapX SDK request failed",
      idRequest = null,
      idResolver = null,
      detail = null,
    } = options;
    super(message);
    this.name = "MapxSdkError";
    this.code = code;
    this.idRequest = idRequest;
    this.idResolver = idResolver;
    this.detail = detail;
  }
}
