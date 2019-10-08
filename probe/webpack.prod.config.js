const merge = require('webpack-merge');
const baseConfig = require('./webpack.base.config.js');
const webpack = require('webpack');

module.exports = merge(baseConfig, {
  mode: 'production',
  plugins: [
    new webpack.DefinePlugin({
      WS_WEBSOCKET_ORG_URI: JSON.stringify('wss://echo.websocket.org/'),
      WS_MAPX_URI: JSON.stringify('wss://ws-echo.mapx.org/')
    })
  ]
});
