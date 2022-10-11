

const defaults = {

}


/**
* Base class that should work with ws_tools_instances
*/
export class WsToolsBase {
    constructor(socket,config){
      const wsb = this.socket;
      wsb._socket = socket;
      wsb._config = Object.assign({},defaults,config);
    }
    

}
