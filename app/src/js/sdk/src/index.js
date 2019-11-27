import {FrameManager, FrameWorker} from './framecom.js';
import * as settings from './settings.json'; 

class MxSdk extends FrameManager {
  constructor(opt) {
    super(opt);
    this.opt = Object.assign({}, settings, opt);
  } 
}

class MxSdkWorker extends FrameWorker {
   constructor(opt){
     super(opt);
   }
}

export {MxSdk, MxSdkWorker};
