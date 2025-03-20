const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const {WatchFolderPlugin} = require('./webpack.watch_folder.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const meta = require('./meta.json');
require('dotenv').config({path: '../mapx.dev.env'});

module.exports = merge(common, {
  mode: 'development',
  devServer: {
    contentBase: './www'
  },
  watchOptions: {
    poll: 1000,
    ignored: ['node_modules']
  },
  plugins: [
    new WatchFolderPlugin({
      folder: './src/data/dict',
      script: 'npm run build:dict'
    }),
    new HtmlWebpackPlugin({
      meta : meta,
      template: './src/html/static.html',
      filename: './static.html',
      chunks: ['mx','theme', 'static', 'jquery'],
    }),
    new HtmlWebpackPlugin({
      meta : meta,
      template: './src/html/index.html',
      filename: './index.html',
      chunks: ['mx', 'theme', 'jquery', 'shiny']
    }),
    new webpack.DefinePlugin({
      API_PORT_PUBLIC: JSON.stringify(process.env.API_PORT_PUBLIC),
      API_HOST_PUBLIC: JSON.stringify(process.env.API_HOST_PUBLIC)
    })
  ]
});
