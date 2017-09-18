/*jshint esversion: 6 */


/**
* Script to launch a script after an evenement occurs in a folder
*/
const fs = require("fs");
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;
let watcher;

function watchFilePlugin(options) {
  this.options = options;
}

watchFilePlugin.prototype.apply = function(compiler) {
  var that = this;
  var watchFolder = that.options.watchFolder;
  var script = that.options.script;

  function serializeScript(script) {
    if (typeof script === 'string') {
      const [command, ...args] = script.split(' ');
      return {command, args};
    }
    const {command, args} = script;
    return {command, args};
  }
  function handleScript(script){
    const {command, args} = serializeScript(script);
    const proc = spawn(command, args, {stdio: 'inherit'});
    proc.on('close', function(error,stdout,stderr){if(error) throw error;});
  }

  compiler.plugin("emit", function(compilation, callback) {
    if(watcher) watcher.close();

    watcher = fs.watch(watchFolder,{interval:5000},function(eventType,filename){
      if(filename){
        console.log(script);
        handleScript(script) ;      
        watcher.close();
      }

    });

    callback();
  });
};


module.exports = watchFilePlugin;
