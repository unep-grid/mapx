import {FrameManager, FrameWorker} from './framecom.js';

class MxSdk extends FrameManager {
  constructor(opt) {
    super(opt);
  } 
}

class MxSdkWorker extends FrameWorker {
   constructor(opt){
     super(opt);
   }
}

export {MxSdk, MxSdkWorker};
