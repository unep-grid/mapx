/*jshint esversion: 6 */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  node : {
    fs : 'empty'
  },
  entry: {
    'app':'./src/js/index.js'
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common' // Specify the common bundle's name.
    }),
    new HtmlWebpackPlugin({
      inject: 'head',
      template : './src/html/index.html'
    }),
  ],
  module: {
    noParse: /(mapbox-gl)\.js$/,
    rules: [
      { test: /worker\.js$/, loader: 'worker-loader'},
      { test: /\.js$/, loader:'babel-loader', options:{presets:['es2015']},exclude: /node_modules/},
      { test: /\.dot$/, use: 'dot-loader' },
      { test: /.css$/, 
        use : [
          { loader: 'style-loader'},
          { loader: 'css-loader' }
        ]
      },

      { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&mimetype=application/font-woff" },
      { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" }
    ]
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '../www')
  }
};
