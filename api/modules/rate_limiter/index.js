import { redisGetJSON, redisSetJSON } from "#mapx/db";
import { convertDuration } from "./duration.js";

const DEFAULT_CONFIG = {
  interval: 60 * 1000,
  limit: 1000,
  dev: false,
};

/**
 * RateLimiter class for controlling request rates using any unique identifier.
 * Uses Redis for distributed rate limiting across multiple server instances.
 *
 * @class
 */
export class RateLimiter {
  /**
   * Create a new RateLimiter instance.
   *
   * @param {Object} [config] - Configuration options for the rate limiter.
   * @param {number} [config.interval=60000] - The time window for rate limiting in milliseconds.
   * @param {number} [config.limit=1000] - The maximum number of requests allowed within the interval.
   */
  constructor(config = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a request should be allowed based on the rate limit.
   *
   * @async
   * @param {string} identifier - A unique identifier for the client (e.g., IP address, user ID).
   * @param {number} [cost=1] - The cost of this request, default is 1.
   * @returns {Promise<boolean>} Returns true if the request is allowed, false if it exceeds the rate limit.
   * @throws {Error} Throws an error if the rate limit is exceeded.
   */
  async check(identifier, cost = 1) {
    const client = await this.get(identifier);
    const now = Date.now();
    const reset = now > client.resetTime;

    if (reset) {
      client.count = cost;
      client.resetTime = now + this.interval;
    } else {
      client.count += cost;
    }

    const block = client.count > this.limit;
    if (block) {
      const t = convertDuration(client.resetTime - now);
      const msg = `Rate limit exceeded. Please try again in ${t}.`;
      if (this._config.dev) {
        console.warn(msg);
      } else {
        throw new Error(msg);
      }
    }

    await this.set(identifier, client);
    return true;
  }

  /**
   * Retrieve the rate limit data for an identifier from Redis.
   *
   * @async
   * @param {string} identifier - The unique identifier for the client.
   * @returns {Promise<Object>} The rate limit data for the identifier.
   */
  async get(identifier) {
    const client = await redisGetJSON(this._key(identifier));
    return client || this.default;
  }

  /**
   * Set the rate limit data for an identifier in Redis.
   *
   * @async
   * @param {string} identifier - The unique identifier for the client.
   * @param {Object} data - The rate limit data to store.
   */
  async set(identifier, data) {
    await redisSetJSON(this._key(identifier), data, "EX", this.interval * 2);
  }

  /**
   * Generate a unique Redis key for an identifier.
   *
   * @private
   * @param {string} identifier - The unique identifier for the client.
   * @returns {string} The generated Redis key.
   */
  _key(identifier) {
    return `ratelimiter::${identifier}`;
  }

  /**
   * Get the configured interval.
   *
   * @returns {number} The rate limit interval in milliseconds.
   */
  get interval() {
    return this._config.interval;
  }

  /**
   * Get the configured request limit.
   *
   * @returns {number} The maximum number of requests allowed within the interval.
   */
  get limit() {
    return this._config.limit;
  }

  /**
   * Get the default rate limit data for a new client.
   *
   * @returns {Object} The default rate limit data.
   */
  get default() {
    const now = Date.now();
    return {
      count: 0,
      resetTime: now + this.interval,
    };
  }
}
