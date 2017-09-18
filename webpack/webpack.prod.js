/*jshint esversion: 6 */
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ClosureCompilerPlugin = require('webpack-closure-compiler');

module.exports = merge(common, {
  devtool : false,
  plugins: [
     new webpack.DefinePlugin({
             'process.env.NODE_ENV': '"production"'
    }),
    new BundleAnalyzerPlugin(),
    new UglifyJSPlugin({
      parallel: {
        cache: true,
        workers: 4 // for e.g
      },
      uglifyOptions: {
        ie8: false,
        mangle : true,
        compress: {
          warnings: false,
          comparisons: false 
        },
      }
    })
/*    new ClosureCompilerPlugin({*/
      //compiler: {
        ////jar: 'path/to/your/custom/compiler.jar', //optional
        //language_in: 'ECMASCRIPT6',
        //language_out: 'ECMASCRIPT5',
        //compilation_level: 'SIMPLE'
      //},
      //concurrency: 3,
    /*})*/
  ]

});


