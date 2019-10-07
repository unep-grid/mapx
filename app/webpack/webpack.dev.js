/*jshint esversion: 6 */
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const watchUi = require('./webpack.watch_ui.js');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(common, {
  mode: 'development',
  devServer: {
    contentBase: './www'
  },
  plugins: [
    new watchUi({
      watchFolder: "./src/data/dict",
      script: 'Rscript ./src/r/scripts/build_dict_json.R ./src/data/dict_built'
    }),
    new HtmlWebpackPlugin({
      template: './src/html/kiosk.html',
      filename: './kiosk.html',
      chunks: ['common', 'kiosk']
    }),
    new HtmlWebpackPlugin({
      inject: 'head',
      template: './src/html/index.html',
      chunks: ['common', 'app']
    }),
  ]
});
