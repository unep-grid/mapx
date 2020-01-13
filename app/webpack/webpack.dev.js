/*jshint esversion: 6 */
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const watchUi = require('./webpack.watch_ui.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config({path: '../mapx.dev.env'});

module.exports = merge(common, {
  mode: 'development',
  devServer: {
    contentBase: './www'
  },
  plugins: [
    new watchUi({
      watchFolder: './src/data/dict',
      script: 'npm run build_dict'
    }),
    new HtmlWebpackPlugin({
      template: './src/html/static.html',
      filename: './static.html',
      chunks: ['mx', 'static', 'jquery']
    }),
    new HtmlWebpackPlugin({
      inject: 'head',
      template: './src/html/index.html',
      chunks: ['mx', 'jquery', 'shiny']
    }),
    new webpack.DefinePlugin({
      API_PORT_PUBLIC: JSON.stringify(process.env.API_PORT_PUBLIC),
      API_HOST_PUBLIC: JSON.stringify(process.env.API_HOST_PUBLIC)
    })
  ]
});
