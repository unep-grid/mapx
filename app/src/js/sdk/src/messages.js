import {Translator} from './translate.js';
const t = new Translator();

class MessageFrameCom {
  constructor(opt) {
    Object.assign(
      this,
      {level: 'log', text: '', key: '', emitter: null, vars: {}, lang: 'en'},
      opt
    );
    this.type = 'message';
    if (this.key) {
      this.text = t.get(this.key, this.vars, this.lang);
    }
    return this;
  }
}

class StateFrameCom {
  constructor(opt) {
    Object.assign(this, {state: null}, opt);
    this.type = 'state';
    return this;
  }
}

class EventFrameCom {
  constructor(opt) {
    Object.assign(this, {value: null}, opt);
    this.type = 'event';
    return this;
  }
}

class ResponseFrameCom {
  constructor(opt) {
    Object.assign(this, {idRequest: null, value: [], success: true}, opt);
    this.type = 'response';
    return this;
  }
}

class RequestFrameCom {
  constructor(opt) {
    Object.assign(this, {idRequest: null, idResolver: null, value: null}, opt);
    this.type = 'request';
    return this;
  }
}

export {MessageFrameCom, ResponseFrameCom, StateFrameCom, RequestFrameCom, EventFrameCom};
