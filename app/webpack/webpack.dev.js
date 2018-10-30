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
    }),
    /**
    * Dev service worker : do not store js, html, css, only runtime
    *
    */
    new GenerateSW({
      swDest : 'service-worker.js',
      importWorkboxFrom : 'local',
      exclude: [/\.js$/, /\.html$/,/\.css$/],
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
    })
  ]
});
