/*jshint esversion: 6 */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const IconFontPlugin = require('icon-font-loader').Plugin;
const webpack = require( 'webpack');
const SWPrecacheWebpackPlugin = require("sw-precache-webpack-plugin");

module.exports = {
  node : {
    fs : 'empty'
  },
  entry: {
    'app':'./src/js/index.js'
  },
  plugins: [
    // set caching strategy
    new SWPrecacheWebpackPlugin({
      cacheId: 'mapx',
      maximumFileSizeToCacheInBytes: 10485760,
      filename: 'service-worker.js',
      minify: true,
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
    }),

    new webpack.optimize.CommonsChunkPlugin({
      //name: 'common' // Specify the common bundle's name.
      name: ['runtime']
    }),
    new HtmlWebpackPlugin({
      inject: 'head',
      template : './src/built/index.html'
    }),
    new IconFontPlugin({
      fontName : "mx-icons-font"
    })
  ],
  module: {
    noParse: /(mapbox-gl)\.js$/,
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
        use: { loader: 'worker-loader' }},
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
                }
              }            
              ]
            ],
            plugins:['loop-optimizer','dynamic-import-node']
          }
        }
      },
      { test: /\.dot$/, use: 'dot-loader' }, 
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
  },
  output: {
    filename: '[name]-[hash].bundle.js',
    path: path.resolve(__dirname, '../www')
  }
};
