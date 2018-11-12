/*jshint esversion: 6 */
const path = require('path');
const webpack = require( 'webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const IconFontPlugin = require('icon-font-loader').Plugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
//const ManifestPlugin = require('webpack-manifest-plugin');
/**
* To remove in dev
*/
//const {GenerateSW} = require('workbox-webpack-plugin');
module.exports = {
  target: 'web',
  node : {
    fs : 'empty'
  },
  entry: {
    sw : './src/js/init_sw.js',
    common:'./src/js/init_common.js',
    app : './src/js/init_shiny.js',
    kiosk : './src/js/init_kiosk.js'
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: "[name].chunk.js",
    path: path.resolve(__dirname, '../www'),
    publicPath: "/"
  },
  plugins: [
    new HtmlWebpackPlugin({
      template : './src/kiosk/index.html',
      filename: './kiosk.html',
      chunks : ['common','sw','kiosk']
    }),
    new HtmlWebpackPlugin({
      inject: 'head',
      template : './src/built/index.html',
      chunks : ['common','sw','app']
    }),
    new WebpackPwaManifest({
      filename : "manifest.json",
      inject:true, /* added manually in header.R */
      name: 'MapX',
      start_url:'/',
      short_name: 'MapX',
      description: 'A cloud solution for mapping and monitoring the sustainable use of natural resources',
      background_color: '#15b0f8',
      'theme-color': '#15b0f8',
      theme_color: '#15b0f8',
      crossorigin: 'use-credentials', //can be null, use-credentials or anonymous
      icons: [
        {
          src: './src/svg/map-x-logo.svg',
          sizes: [96, 128, 192, 256, 384, 512,1024] // multiple sizes
        }
      ]
    }),
    new IconFontPlugin({
      fontName : "mx-icons-font"
    }),
    new CopyWebpackPlugin(
      [ { from : './src/sprites', to: 'sprites/'} ]
    ),
    /**
    * To remmove in dev!
    */
    //new CopyWebpackPlugin(
      //[ { from : './webpack/sw_listen_skip_waiting_install.js', to: 'sw_listen_skip_waiting_install.js'} ]
    //),
    //new GenerateSW({
      //swDest : 'service-worker.js',
      //importWorkboxFrom : 'local',
      //skipWaiting : false, [> do not wait on other clients <]
      //clientsClaim : true, [> handle all clients as soon as it's activated <]
      //importScripts : ['sw_listen_skip_waiting_install.js'],
      //runtimeCaching :  [
        //{
          //urlPattern: /^https:\/\/api\.mapbox\.com\//,
          //handler: 'cacheFirst'
        //},
        //{
          //urlPattern: /^https:\/\/tiles\.mapbox\.com\//,
          //handler: 'cacheFirst'
        //},
        //{
          //urlPattern: /^(https|http):\/\/api\.mapx\..*\/get\/view\//,
          //handler: 'cacheFirst'
        //},
        //{
          //urlPattern: /^(https|http):\/\/api\.mapx\..*\/get\/tile\//,
          //handler: 'cacheFirst'
        //},
        //{
          //urlPattern: /^https:\/\/.*wms\?bbox=/,
          //handler: 'cacheFirst'
        //},
        //{
          //urlPattern: /^https:\/\/.*api\.here\.com\/maptile/,
          //handler: 'cacheFirst'
        //}
      //]
    //}),

  ],
  module: {
    rules: [
      { test: /.css$/, 
        use : ['style-loader','css-loader','icon-font-loader']
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: [
          'url-loader?limit=10000',
          'img-loader'
        ]
      },
      { 
        test: /worker\.js$/, 
        use: { loader: 'worker-loader' }
      },
      { 
        test: /\.js$/, 
        exclude: /node_modules/,
        use : {
          loader:'babel-loader', 
          options:{
            presets: [
              [ '@babel/preset-env',{
                "targets": {
                  "browsers": ["defaults"] // https://github.com/ai/browserslist#queries
                },
                modules: false 
              }            
              ]
            ],
            plugins:['loop-optimizer','@babel/syntax-dynamic-import']
          }
        }
      },
      { test: /\.dot$/, loader: 'dot-loader',options : {} }, 
      {
        test: /\.coffee$/,
        use: 'coffee-loader'      //used mainly to extend ContentTools
      },
      { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&mimetype=application/font-woff" },
      { test: /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" },
      {
        test: /\.csv$/,
        loader: 'csv-loader',
        options: {
          dynamicTyping: true,
          header: true,
          skipEmptyLines: true
        }
      }
    ]
  }
};
