/*jshint esversion: 6 */
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
//const ClosureCompilerPlugin = require('webpack-closure-compiler');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const {GenerateSW} = require('workbox-webpack-plugin');
const ClosurePlugin = require('closure-webpack-plugin');

module.exports = merge(common, {
  devtool : false,
  plugins: [
    new webpack.optimize.OccurrenceOrderPlugin(),
    new GenerateSW({
      swDest : 'service-worker.js',
      importWorkboxFrom : 'local',
      runtimeCaching :  [
        {
          urlPattern: /^https:\/\/api\.mapbox\.com\//,
          handler: 'cacheFirst'
        },
        {
          urlPattern: /^https:\/\/tiles\.mapbox\.com\//,
          handler: 'cacheFirst'
        },
        {
          urlPattern: /^(https|http):\/\/api\.mapx\..*\/get\/view\//,
          handler: 'cacheFirst'
        },
        {
          urlPattern: /^(https|http):\/\/api\.mapx\..*\/get\/tile\//,
          handler: 'cacheFirst'
        },
        {
          urlPattern: /^https:\/\/.*wms\?bbox=/,
          handler: 'cacheFirst'
        },
        {
          urlPattern: /^https:\/\/.*api\.here\.com\/maptile/,
          handler: 'cacheFirst'
        }
      ]
    }),
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
    /*    new ClosurePlugin({mode: 'STANDARD'}, {*/
    //}),

    new FaviconsWebpackPlugin('./src/png/map-x-logo.png')
  ]

});


