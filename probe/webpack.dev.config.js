const merge = require('webpack-merge');
const baseConfig = require('./webpack.base.config.js');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const webpack = require('webpack');

module.exports = merge(baseConfig, {
  mode: 'development',
  plugins: [
    new BrowserSyncPlugin({
      host: 'localhost',
      port: 3000,
      server: {baseDir: ['dist']},
      files: ['dist/index.html', 'src/test.js']
    }),
    new webpack.DefinePlugin({
      WS_WEBSOCKET_ORG_URI: JSON.stringify('wss://echo.websocket.org/'),
      WS_MAPX_URI: JSON.stringify('ws://wsecho.mapx.localhost:8880/')
    })
  ]
});
