import { FrameManager } from "./frameManager.js";
import { FrameWorker } from "./frameWorker.js";
import { MapxSdkError } from "./sdk_error.js";

/**
 * Class to wrap frame manager with custom options
 */
class Manager extends FrameManager {
  /**
   * Create new manager with custom options
   * @param {Object} opt Options
   */
  constructor(opt) {
    super(opt);
  }
}

/**
 * Class to wrap frame worker with custom options
 */
class Worker extends FrameWorker {
  /**
   * Create new worker with custom options
   * @param {Object} opt Options
   */
  constructor(opt) {
    super(opt);
  }
}

export { Manager, Worker, MapxSdkError };
