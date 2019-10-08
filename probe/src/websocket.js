var defaults = {
  onMessage: function() {},
  onWarning: function() {},
  onError: function() {},
  onClose: function() {},
  onStop: function() {},
  onOpen: function() {},
  onPause: function() {},
  onHeartbeat: function() {},
  log_levels: ['open', 'close', 'message', 'error', 'timeover', 'stop'],
  time_send: 5 * 1e3,
  time_heartbeat: 5 * 1e3,
  time_response_max: 30 * 1e3
};

class WsTest {
  constructor(url, opt) {
    var wt = this;
    wt.opt = Object.assign({}, defaults, opt);
    wt.url = url;
    wt.sent = 0;
    wt.received = 0;
    wt.time_stop = wt.time_start;
    wt.time_last_message = 0;
    wt.started = false;
    wt.paused = true;
    wt.logs = [];
    wt.heartbeat_loop();
    wt.start();
  }

  start() {
    var wt = this;
    wt.pause(false);
    wt.alive();
    wt.log('start');

    try {
      if (!wt.started) {
        wt.ws = new WebSocket(wt.url);
        var ws = wt.ws;
        ws.onclose = wt._onClose.bind(this);
        ws.onmessage = wt._onMessage.bind(this);
        ws.onerror = wt._onError.bind(this);
        ws.onopen = wt._onOpen.bind(this);
      } else {
        if (!wt.paused) {
          wt.send_loop();
        }
      }
    } catch (e) {
      wt._onError(e);
    }
  }

  toggle() {
    var wt = this;
    if (wt.paused) {
      wt.start();
    } else {
      wt.pause();
    }
  }

  log(type, msg) {
    var wt = this;
    var ignore = wt.opt.log_levels.indexOf(type) === -1;
    if (ignore) {
      return;
    }
    wt.logs.push({
      type: type || 'log',
      msg: msg || '',
      time: Date.now()
    });
  }

  pause(enable) {
    var wt = this;
    if (enable === false) {
      wt.paused = enable;
    } else {
      wt.paused = true;
      wt.log('pause');
      wt.opt.onPause();
    }
  }

  stop(m) {
    var wt = this;
    wt.log('stop', m);
    wt.stopped = true;
    wt.ws.close();
    wt.opt.onStop(m);
  }
  _onOpen(e) {
    var wt = this;
    wt.started = true;
    wt.alive();
    wt.send_loop();
    wt.opt.onOpen(e);
    wt.log('open');
  }
  _onMessage(e) {
    var wt = this;
    var msg = '';
    wt.alive();
    if (e instanceof MessageEvent) {
      if (e.data.indexOf('Request') > -1) {
        return;
      }
      msg = JSON.parse(e.data);
      wt.opt.onMessage(msg);
      wt.log('message', msg);
      wt.received++;
    }
  }
  _onClose(e) {
    var wt = this;
    var msg = '';
    if (e instanceof CloseEvent) {
      msg = 'Code ' + e.code + (e.reason ? ' Reason:' + e.reason : '');
    } else {
      msg = e;
    }
    wt.opt.onClose(msg);
    wt.log('close', msg);
  }
  _onError(e) {
    var wt = this;
    var msg = '';
    if (e instanceof Error) {
      msg = e.message;
    } else if (typeof e === 'string') {
      msg = e;
    } else {
      msg = 'Error';
    }
    wt.opt.onError(msg);
    wt.log('error', msg);
  }
  _onTimeOver() {
    var wt = this;
    wt.log('timeover',wt.getStatus());
    wt.stop(`Waiting time reached (${wt.opt.time_response_max} ms)`);
  }

  alive() {
    this.time_last_alive = Date.now();
  }
  getLastTimeAlive() {
    return this.time_last_alive;
  }

  send_loop() {
    var wt = this;
    try {
      var skip = wt.paused || wt.stopped || wt.isTimeOver();
      if (skip) {
        return;
      }
      wt.ws.send(
        JSON.stringify({
          time: Date.now(),
          count: wt.sent
        })
      );
      wt.sent++;
      setTimeout(wt.send_loop.bind(wt), wt.opt.time_send);
    } catch (e) {
      wt._onError(e);
    }
  }

  getStatus(){
    var wt = this;
    return {
      sent: wt.sent,
      received: wt.received
    };
  }

  getLogs(){
    var wt = this;
    return wt.logs;
  }

  heartbeat_loop() {
    var wt = this;
    var stop = wt.stopped || wt.isTimeOver();
    if (stop) {
      return;
    }
    wt.opt.onHeartbeat(wt.getStatus());
    setTimeout(wt.heartbeat_loop.bind(wt), wt.opt.time_heartbeat);
  }

  isTimeOver() {
    var wt = this;
    var now = Date.now();
    var paused = wt.paused;
    if (paused) {
      return false;
    }
    var limit = wt.getLastTimeAlive() + wt.opt.time_response_max;
    var isOver = now >= limit;
    if (isOver) {
      wt._onTimeOver();
    }
    return isOver;
  }
}

export {WsTest};
