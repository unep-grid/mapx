/*jshint esversion: 6 */
const fs = require("fs");
const spawn = require('child_process').spawn;
const exec = require('child_process').exec;

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
    that.watcher = fs.watch(watchFolder,{interval:5000},function(eventType,filename){
      if(filename){
        console.log(script);
        handleScript(script) ;      
        that.watcher.close();
      }

    });

    callback();
  });
};


module.exports = watchFilePlugin;
