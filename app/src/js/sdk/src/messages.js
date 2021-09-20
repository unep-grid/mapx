import {Translator} from './translate.js';
const t = new Translator();

class MessageBase {
  constructor() {
    Object.assign(this, {
      // idPair worker <-> manager 
      idPair: null,
      // type is always replaced...
      type: 'base'
    });
  }
}

class MessageFrameCom extends MessageBase {
  constructor(opt) {
    super();
    Object.assign(
      this,
      {
        level: 'log',
        text: '',
        key: '',
        emitter: null,
        vars: {},
        lang: 'en'
      },
      opt,
      {
        type: 'message'
      }
    );
    if (this.key) {
      this.text = t.get(this.key, this.vars, this.lang);
    }
    return this;
  }
}

class StateFrameCom extends MessageBase {
  constructor(opt) {
    super();
    Object.assign(
      this,
      {
        state: null
      },
      opt,
      {
        type: 'state'
      }
    );
    return this;
  }
}

class EventFrameCom extends MessageBase {
  constructor(opt) {
    super();
    Object.assign(
      this,
      {
        value: null
      },
      opt,
      {
        type: 'event'
      }
    );
    return this;
  }
}

class ResponseFrameCom extends MessageBase {
  constructor(opt) {
    super();
    Object.assign(
      this,
      {
        idRequest: null,
        value: [],
        success: true
      },
      opt,
      {
        type: 'response'
      }
    );
    return this;
  }
}

class RequestFrameCom extends MessageBase {
  constructor(opt) {
    super();
    Object.assign(
      this,
      {
        idRequest: null,
        idResolver: null,
        value: null
      },
      opt,
      {
        type: 'request'
      }
    );
    return this;
  }
}

export {
  MessageFrameCom,
  ResponseFrameCom,
  StateFrameCom,
  RequestFrameCom,
  EventFrameCom
};
