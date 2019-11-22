const settings = {
  url: '',
  onCollect: () => {},
  onResponse: () => {},
  validate: () => {
    return false;
  },
  timeCollect: 15000,
  baseForm: {},
  baseLog: {}
};

class Logger {
  constructor(opt) {
    const lgr = this;
    lgr.opt = Object.assign({}, settings, opt);
    lgr.queue = [];
    lgr.timer = null;
    lgr.url = null;
    lgr.init();
  }

  destroy() {
    removeInterval(lgr.timer);
  }

  init() {
    const lgr = this;
    if (!lgr.timer) {
      lgr.url = new URL(lgr.opt.url);
      lgr.timer = setInterval(lgr.collect.bind(lgr), lgr.opt.timeCollect);
    }
  }

  add(dataLog) {
    const lgr = this;
    const log = Object.assign(
      {date_modified: Date.now()},
      lgr.baseLog,
      dataLog
    );
    const isValid = lgr.validate(log);
    if (isValid) {
      lgr.queue.push(log);
    } else {
      console.warn('Ignore invalid log', log);
    }
  }

  validate(log) {
    const lgr = this;
    return lgr.opt.validate(log);
  }

  collect() {
    const lgr = this;
    try {
      if (lgr.queue.length > 0 && lgr.url instanceof URL) {
        const dataOut = Object.assign({logs: lgr.queue.map(l=>l)}, lgr.opt.baseForm);
        lgr.queue.length = 0;
        lgr.opt.onCollect(dataOut);
        postData(lgr.url, dataOut);
      }
    } catch (error) {
      console.error(error);
    }
  }
}

export {Logger};

function postData(url = '', data = {}) {
  return fetch(url, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json'
    },
    redirect: 'follow',
    referrer: 'no-referrer',
    body: JSON.stringify(data)
  });
}


