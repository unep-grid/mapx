# MapX diagnostic tool

https://probe.mapx.org/

This is a tool to check if your browser and network settings match MapX requirements.

Sources :

- https://github.com/mapbox/mapbox-gl-supported


## Configuration

Websocket endpoints URL are specified in `webpack.dev.config.js` and `webpack.prod.config.js`.

## Build

```
$ npm run prod # build prod output
$ npm run dev [-- --watch] # build dev output and optionally use browserSync
```
