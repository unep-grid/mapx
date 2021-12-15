/*jshint esversion: 6 */

/**
 * Script to launch a script after an evenement occurs in a folder
 */
const fs = require('fs');
const spawn = require('child_process').spawn;
const def = {
  folder: __dirname,
  script: null,
  regFilter: new RegExp('dict_[a-zA-Z]*.json$'),
  dev: true
};
const watcher = {};

class WatchFolderPlugin {
  constructor(opt) {
    this._opt = Object.assign({}, def, opt);
  }
  log(m, type) {
    type = type || 'log';
    if (this._opt.dev) {
      console[type](m);
    }
  }
  apply(compiler) {
    const wfp = this;
    const watchFolder = wfp._opt.folder;
    const script = wfp._opt.script;
    const reg = wfp._opt.regFilter;
    compiler.plugin('emit', async (compilation, callback) => {
      // close old watcher
      if (watcher[watchFolder]) {
        wfp.log('WatchFolderPlugin : close after emit');
        watcher[watchFolder].close();
      }
      wfp.log(`WatchFolderPlugin : init on ${watchFolder}`);
      watcher[watchFolder] = fs.watch(
        watchFolder,
        {},
        (eventType, filename) => {
          const update =
            reg.test(filename) &&
            (eventType === 'change' || eventType === 'rename');
          if (update) {
            wfp.handleScript(script);
            wfp.log(`WatchFolderPlugin : close after update ${filename}`);
            watcher[watchFolder].close();
          }
        }
      );

      callback();
    });
  }

  handleScript(script) {
    const wfp = this;
    const {command, args} = wfp.serializeScript(script);
    const proc = spawn(command, args, {stdio: 'inherit'});
    proc.on('close', (error, stdout, stderr) => {
      if (error) {
        wfp.log(error, 'error');
      }
    });
  }

  serializeScript(script) {
    if (typeof script === 'string') {
      const [command, ...args] = script.split(' ');
      return {command, args};
    }
    const {command, args} = script;
    return {command, args};
  }
}

module.exports = {WatchFolderPlugin};
