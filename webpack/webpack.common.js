/*jshint esversion: 6 */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  node : {
    fs : 'empty'
  },
  entry: {
    'app':'./src/js/index.js',
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common' // Specify the common bundle's name.
    }),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery"
    }),
    new HtmlWebpackPlugin({
      template: './src/html/index.html',
      title: 'mapx'
    }),
  ],
  module: {
    rules: [
      { test: /\.js$/, loader:'babel-loader', options:{presets:['es2015']},exclude: /node_modules/},
      { test: /\.dot.html$/, use: 'dot-loader' },
      { test: /\.css$/, loader: ['style-loader','css-loader'] },
      {
        test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/,
        loader: 'url-loader'
      }
    ]
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '../www')
  }
};
