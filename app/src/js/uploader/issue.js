/**
 * Represents an Issue.
 * @class
 */
export class Issue {
  /**
   * Creates an instance of Issue.
   * @constructor
   * @param {string} level - The level of the issue (info, warning, error).
   * @param {string} type - The type of the issue.
   * @param {Object} data - Data associated.
   */
  constructor(level, type, data) {
    /**
     * The level of the issue.
     * @type {string}
     * @private
     */
    this._level = level || "warning";
    /**
     * The type of the issue.
     * @type {string}
     * @private
     */
    this._type = type;
    /**
     * The data of the issue.
     * @type {Object}
     * @private
     */
    this._data = data;
  }

  /**
   * Gets the type of the issue.
   * @returns {string} The type of the issue.
   */
  get type() {
    return this._type;
  }

  /**
   * Gets the level of the issue.
   * @returns {string} The level of the issue.
   */
  get level() {
    return this._level;
  }

  /**
   * Gets the associated data.
   * @returns {Object} The data of the issue.
   */
  get data() {
    return this._data;
  }
}
