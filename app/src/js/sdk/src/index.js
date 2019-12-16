import {FrameManager, FrameWorker} from './framecom.js';
import * as settings from './settings.json'; 

class Manager extends FrameManager {
  constructor(opt) {
    super(opt);
    this.opt = Object.assign({}, settings, opt);
  } 
}

class Worker extends FrameWorker {
   constructor(opt){
     super(opt);
   }
}

export {Manager, Worker};
