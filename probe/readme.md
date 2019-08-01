# Websocket and Mapbox GL JS

https://probe.mapx.org/

## Checklist for support

This is a simple page to test if your browser support WebGL and other features used by Mapbox GL JS. It's based on `mapbox-gl-supported` package, but use a step by step approach instead of a global pass/not pass result.

It also test for a secure connection via websocket.

Sources :

- https://github.com/mapbox/mapbox-gl-supported
- https://gist.github.com/miebach/3293565

## Build

Use the following instructions to build:

```
$ npm run build:prod # build prod output
$ npm run build:dev [-- --watch] # build dev output and optionally use browserSync
```
