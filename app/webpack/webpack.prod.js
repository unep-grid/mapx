/*jshint esversion: 6 */
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CleanWebpackPlugin = require('clean-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const {GenerateSW} = require('workbox-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  plugins: [
// clean www before building
    new CleanWebpackPlugin(
      [
        '../www/*'
      ],
      {
        exclude:  [],
        dry: false,
        allowExternal: true
      }
    ),
    new BundleAnalyzerPlugin(),
    //new FaviconsWebpackPlugin('./src/svg/map-x-logo.svg'),
    /**
    * last step, generate service worker
    * Configuration : https://developers.google.com/web/tools/workbox/modules/workbox-webpack-plugin#configuration
    * more info here : https://developers.google.com/web/tools/workbox/guides/codelabs/webpack
    */
    new GenerateSW({
      swDest : 'service-worker.js',
      importWorkboxFrom : 'local',
      skipWaiting : true, /* do not wait on other clients */
      clientsClaim : true, /* handle all clients as soon as it's activated */
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
  ]

});


