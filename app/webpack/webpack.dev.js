/*jshint esversion: 6 */
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const watchUi = require('./webpack.watch_ui.js');
const {GenerateSW} = require('workbox-webpack-plugin');

module.exports = merge(common, {
  mode: 'development',
  devServer: {
    contentBase: './www'
  },
  plugins: [
    new watchUi({
      watchFolder: "./src/ui",
      script: 'Rscript ./src/script/build_html.R'
    }),
    new watchUi({
      watchFolder: "./src/data",
      script: 'Rscript ./src/script/build_dict_json.R'
    })
  ]
});
