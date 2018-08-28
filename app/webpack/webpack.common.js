/*jshint esversion: 6 */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const IconFontPlugin = require('icon-font-loader').Plugin;
const webpack = require( 'webpack');
const packages = require('../package.json').dependencies;
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = {
  node : {
    fs : 'empty'
  },
  entry: {
    'common':'./src/js/index.js',
    'app' : './src/js/init_shiny.js',
    'kiosk' : './src/js/init_kiosk.js'
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'shared'
    }),
    new HtmlWebpackPlugin({
      template : './src/kiosk/index.html',
      filename: './kiosk.html',
      chunks : ['babel-polyfill','shared','common','kiosk']
    }),
    new HtmlWebpackPlugin({
      inject: 'head',
      template : './src/built/index.html',
      chunks : ['babel-polyfill','shared','common','app']
    }),
    new IconFontPlugin({
      fontName : "mx-icons-font"
    }),
    new CopyWebpackPlugin(
      [ { from : './src/sprites', to: 'sprites/'} ]
    )
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
                }
              }            
              ]
            ],
            plugins:['loop-optimizer','dynamic-import-node']
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
  },
  output: {
    filename: '[name]-[hash].bundle.js',
    path: path.resolve(__dirname, '../www')
  }
};
