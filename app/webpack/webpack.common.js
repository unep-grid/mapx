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
  optimization: {
    splitChunks: {
      chunks: 'all'
    },
    runtimeChunk: 'single'
  },
  entry: {
    mx: './src/js/init_mx.js',
    jquery: './src/js/init_jquery.js',
    shiny: './src/js/init_shiny.js',
    static: './src/js/init_static.js',
    theme: './src/js/init_theme.js',
    sw: './src/js/init_sw.js'
  },
  output: {
    filename: '[name].[chunkhash].bundle.js',
    chunkFilename: '[name].[chunkhash].chunk.js',
    path: path.resolve(__dirname, '../www'),
    publicPath: ''
  },
  plugins: [
    new WebpackPwaManifest({
      name: 'MapX',
      short_name: 'MapX',
      description:
        'A cloud solution for mapping and monitoring the sustainable use of natural resources',
      background_color: '#15b0f8',
      orientation: 'portrait',
      display: 'standalone',
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
      {from: './src/glyphs/dist/sprites/', to: 'sprites/'},
      {from: './src/glyphs/dist/svg/', to: 'sprites/svg/'},
      {from: './src/glyphs/dist/fontstack', to: 'fontstack/'},
      {from: './src/favicons', to: '.'},
      {from: './src/js/sdk/dist/', to: 'sdk/', ignore: ['.DS_Store']}
    ])
  ],
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
          'icon-font-loader',
          'less-loader'
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
          'icon-font-loader'
        ]
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
          loader: 'babel-loader'
        }
      },
      {test: /\.dot.html$/, loader: 'dot-loader', options: {}},
      {test: /\.html$/, loader: 'html-loader', options: {}},
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
      },
      {
        test: /\.mp3$/,
        loader: 'file-loader'
      },
      {
        test: /\.md$/,
        use: [
          {
            //loader: 'file-loader'
            loader: 'raw-loader',
            options: {
              esModule: false
            }
          }
        ]
      }
    ]
  }
};
