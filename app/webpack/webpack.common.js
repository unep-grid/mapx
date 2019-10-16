/*jshint esversion: 6 */
const path = require('path');
const IconFontPlugin = require('icon-font-loader').Plugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
/**
 * To remove in dev
 */
module.exports = {
  target: 'web',
  node: {
    fs: 'empty'
  },
  entry: {
    sw: './src/js/init_sw.js',
    common: './src/js/init_common.js',
    app: './src/js/init_shiny.js',
    kiosk: './src/js/init_kiosk.js'
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js',
    path: path.resolve(__dirname, '../www'),
    publicPath: '/'
  },
  plugins: [
    new WebpackPwaManifest({
      name: 'MapX',
      short_name: 'MapX',
      description:
        'A cloud solution for mapping and monitoring the sustainable use of natural resources',
      background_color: '#15b0f8',
      crossorigin: 'use-credentials', //can be null, use-credentials or anonymous
      filename: 'manifest.json',
      inject: true,
      start_url: '/',
      'theme-color': '#15b0f8',
      theme_color: '#15b0f8',
      icons: [
        {
          src: './src/png/map-x-logo_1024.png',
          sizes: [96, 128, 192, 256, 384, 512, 1024] // multiple sizes
        }
      ]
    }),
    new IconFontPlugin({
      fontName: 'mx-icons-font'
    }),
    new CopyWebpackPlugin([
      {from: './src/sprites', to: 'sprites/'},
      {from: './src/favicons', to: '.'}
    ])
  ],
  module: {
    rules: [
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader']
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'icon-font-loader']
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: ['url-loader?limit=10000', 'img-loader']
      },
      {
        test: /worker\.js$/,
        use: {loader: 'worker-loader'}
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    browsers: ['defaults'] // https://github.com/ai/browserslist#queries
                  },
                  modules: false
                }
              ]
            ],
            plugins: ['@babel/syntax-dynamic-import']
          }
        }
      },
      {test: /\.dot$/, loader: 'dot-loader', options: {}},
      {
        test: /\.coffee$/,
        use: 'coffee-loader' //used mainly to extend ContentTools
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader?limit=10000&mimetype=application/font-woff'
      },
      {test: /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file-loader'},
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
  }
};
