import { ws } from "../mx";

const opt_default = {
  onCollect: () => {},
  onResponse: () => {},
  validate: () => {
    return false;
  },
  timeCollect: 15000,
  baseForm: {},
  baseLog: {},
  integration_hostname: "0.0.0.0",
};

class Logger {
  constructor(opt) {
    const lgr = this;
    lgr._opt = Object.assign({}, opt_default, opt);
    lgr._queue = [];
    lgr._timer = null;
    lgr.init();
  }

  get opt() {
    return this._opt;
  }
  destroy() {
    removeInterval(lgr._timer);
  }

  init() {
    const lgr = this;
    if (!lgr._timer) {
      lgr._timer = setInterval(lgr.collect.bind(lgr), lgr.opt.timeCollect);
    }
  }

  add(dataLog) {
    const lgr = this;
    const log = Object.assign(
      {
        date_modified: Date.now(),
        hostname: lgr.opt.integration_hostname,
      },
      lgr.baseLog,
      dataLog,
    );
    const isValid = lgr.validate(log);
    if (isValid) {
      lgr._queue.push(log);
    } else {
      console.warn("Ignore invalid log", log);
    }
  }

  validate(log) {
    const lgr = this;
    return lgr.opt.validate(log);
  }

  async collect() {
    const lgr = this;
    try {
      if (lgr._queue.length > 0) {
        const dataOut = Object.assign(
          { logs: lgr._queue.map((l) => l) },
          lgr.opt.baseForm,
        );
        lgr._queue.length = 0;
        lgr.opt.onCollect(dataOut);
        await lgr.emit(dataOut);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async emit(data) {
    const resp = await ws.emitAsync("/client/logs/collect", data);
    if (resp?.errors) {
      console.error(resp.errors);
    }
  }
}

export { Logger };
