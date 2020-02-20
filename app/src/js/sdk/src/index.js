import {FrameManager, FrameWorker} from './framecom.js';
import * as settings from './settings.json'; 

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
    this.opt = Object.assign({}, settings, opt);
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
   constructor(opt){
     super(opt);
   }
}

export {Manager, Worker};
