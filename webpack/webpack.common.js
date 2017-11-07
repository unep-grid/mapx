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
      //name: 'common' // Specify the common bundle's name.
      name: ['runtime']
    }),
    new HtmlWebpackPlugin({
      inject: 'head',
      template : './src/built/index.html'
    }),
  ],
  module: {
    noParse: /(mapbox-gl)\.js$/,
    rules: [
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: [
          'url-loader?limit=10000',
          'img-loader'
        ]
      },
      { test: /worker\.js$/, loader: 'worker-loader'},
      { test: /\.js$/, loader:'babel-loader', options:{presets:['es2015']},exclude: /node_modules/},
      { test: /\.dot$/, use: 'dot-loader' },
      { test: /.css$/, 
        use : [
          { loader: 'style-loader'},
          { loader: 'css-loader' }
/*          { loader: 'postcss-loader', options: { */
            //config:{
              //path:'webpack/postcss.config.js'
            //}
          /*} */
          //}
        ]
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
    filename: '[name].[chunkhash].bundle.js',
    path: path.resolve(__dirname, '../www')
  }
};
