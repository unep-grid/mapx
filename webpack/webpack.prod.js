/*jshint esversion: 6 */
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');

module.exports = merge(common, {
  plugins: [
    new UglifyJSPlugin({
      parallel: {
        cache: true,
        workers: 2 // for e.g
      },
      uglifyOptions: {
        ie8: false,
        mangle : true,
        compress : true,
        warnings: false
      }
    })
  ]

});

//const ClosureCompilerPlugin = require('webpack-closure-compiler');
/*    new ClosureCompilerPlugin({*/
      //compiler: {
        ////jar: 'path/to/your/custom/compiler.jar', //optional
        //language_in: 'ECMASCRIPT5',
        //language_out: 'ECMASCRIPT5',
        //compilation_level: 'ADVANCED'
      //},
      //concurrency: 3,
    /*})*/
