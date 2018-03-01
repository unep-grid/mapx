/*jshint esversion: 6 */
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ClosureCompilerPlugin = require('webpack-closure-compiler');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');

module.exports = merge(common, {
  devtool : false,
  plugins: [
    // clean www before building
    new CleanWebpackPlugin(
      [
        '../www'
      ],
      {
        exclude:  [],
        dry: false,
        allowExternal: true
      }
    ),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    }),
    new BundleAnalyzerPlugin(),
    new UglifyJSPlugin({
      parallel : true,
      cache : true,
      uglifyOptions: {
        ie8: false,
        mangle : true,
        compress: {
          warnings: false,
          comparisons: false 
        }
      }
    }),
    new FaviconsWebpackPlugin('./src/png/map-x-logo.png')
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


