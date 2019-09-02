/*jshint esversion: 6 */
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackShellPlugin = require('webpack-shell-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

//const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const {GenerateSW} = require('workbox-webpack-plugin');

module.exports = merge(common, {
  cache: false,
  mode: 'production',
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  plugins: [
    new WebpackShellPlugin({
      onBuildStart: [
        'Rscript ./src/r/scripts/build_dict_json.R ./src/data/dict_built'
      ],
      onBuildEnd: ['echo "Webpack End"']
    }),
    new CleanWebpackPlugin(['../www/*'], {
      exclude: [],
      dry: false,
      allowExternal: true
    }),
    new HtmlWebpackPlugin({
      template: './src/html/kiosk.html',
      filename: './kiosk.html',
      chunks: ['common', 'sw', 'kiosk']
    }),
    new HtmlWebpackPlugin({
      inject: 'head',
      template: './src/html/index.html',
      chunks: ['common', 'sw', 'app']
    }),

    //new BundleAnalyzerPlugin(),
    //new FaviconsWebpackPlugin('./src/png/map-x-logo.png'),
    /**
     * last step, generate service worker
     * Configuration : https://developers.google.com/web/tools/workbox/modules/workbox-webpack-plugin#configuration
     * more info here : https://developers.google.com/web/tools/workbox/guides/codelabs/webpack
     */
    new CopyWebpackPlugin([
      {
        from: './webpack/sw_listen_skip_waiting_install.js',
        to: 'sw_listen_skip_waiting_install.js'
      }
    ]),
    new GenerateSW({
      swDest: './service-worker.js',
      importWorkboxFrom: 'local',
      skipWaiting: false,
      clientsClaim: true,
      importScripts: ['sw_listen_skip_waiting_install.js'],
      runtimeCaching: [
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
    })
  ]
});
