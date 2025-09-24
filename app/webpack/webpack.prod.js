/*jshint esversion: 6 */
const merge = require("webpack-merge");
const common = require("./webpack.common.js");
//const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const meta = require("./meta.json");

const { GenerateSW } = require("workbox-webpack-plugin");

const runtimeCacheOptions1week = {
  cacheName: "data-cache-1week",
  expiration: {
    maxAgeSeconds: 7 * 24 * 60 * 60,
    maxEntries: 200,
  },
};
const runtimeCacheOptions6months = {
  cacheName: "data-cache-6months",
  expiration: {
    maxAgeSeconds: 6 * 30 * 24 * 60 * 60,
    maxEntries: 200,
  },
};

module.exports = merge(common, {
  cache: false,
  mode: "production",
  plugins: [
    //new BundleAnalyzerPlugin(),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      meta: meta,
      template: "./src/html/static.html",
      filename: "./static.html",
      chunks: ["sw", "mx", "theme", "static", "jquery", "sdk"],
    }),
    new HtmlWebpackPlugin({
      meta: meta,
      template: "./src/html/index.html",
      filename: "./index.html",
      chunks: ["sw", "mx", "theme", "jquery", "shiny", "sdk"],
    }),
    new CopyWebpackPlugin([
      {
        from: "./webpack/sw_listen_skip_waiting_install.js",
        to: "sw_listen_skip_waiting_install.js",
      },
    ]),
    //https://developer.chrome.com/docs/workbox/modules/workbox-build#method-generateSW
    new GenerateSW({
      swDest: "./service-worker.js",
      mode: "production",
      skipWaiting: false,
      clientsClaim: true,
      exclude: [
        /\.DS_Store/,
        /.*\.swp$/,
        /^fontstack/,
        /^sprites/,
        /^CHANGELOG/,
      ],
      importScripts: ["/sw_listen_skip_waiting_install.js"],
      maximumFileSizeToCacheInBytes: 50 * 1e6, //50MB
      runtimeCaching: [
        {
          urlPattern: new RegExp("^https://api.mapbox.com/", "i"),
          handler: "CacheFirst",
          options: runtimeCacheOptions6months,
        },
        {
          urlPattern: new RegExp("^https://tiles.mapbox.com/", "i"),
          handler: "CacheFirst",
          options: runtimeCacheOptions6months,
        },
        {
          urlPattern: new RegExp("^https://.*api.here.com/maptile", "i"),
          handler: "CacheFirst",
          options: runtimeCacheOptions6months,
        },
        {
          urlPattern: new RegExp("^https://.*/wms/.*bbox=", "i"),
          handler: "CacheFirst",
          options: runtimeCacheOptions1week,
        },

        {
          urlPattern: new RegExp(
            "SERVICE=WMTS.*REQUEST=GetTile|REQUEST=GetTile.*SERVICE=WMTS",
            "i",
          ),
          handler: "CacheFirst",
          options: runtimeCacheOptions1week,
        },
      ],
    }),
  ],
});
