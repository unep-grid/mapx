var spritezero = require('@mapbox/spritezero');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var SVGO = require('svgo');
var svgo = new SVGO();
var config = JSON.parse(fs.readFileSync('config.json'));
var outSvg = path.resolve(__dirname, config.out, 'svg');

/**
 * SVG optimisation
 */
var svgs = glob.sync(config.source).map((f) => {
  return {
    svg: fs.readFileSync(f),
    id: path.basename(f).replace('.svg', ''),
    name: path.basename(f)
  };
});

svgs.forEach((svg) => {
  svgo.optimize(svg.svg).then((r) => {
    var svgPath = path.join(outSvg, svg.name);
    fs.writeFileSync(svgPath, r.data);
  });
});

/*
 * Make sprites
 */
config.ratios.forEach((pxRatio) => {
  var pngPath, jsonPath;

  if (pxRatio === 1) {
    pngPath = path.join(config.out, `sprite.png`);
    jsonPath = path.join(config.out, `sprite.json`);
  } else {
    pngPath = path.join(config.out, `sprite@${pxRatio}x.png`);
    jsonPath = path.join(config.out, `sprite@${pxRatio}x.json`);
  }

  // Pass `true` in the layout parameter to generate a data layout
  // suitable for exporting to a JSON sprite manifest file.
  spritezero.generateLayout(
    {imgs: svgs, pixelRatio: pxRatio, format: true},
    (err, dataLayout) => {
      if (err) {
        return;
      }
      fs.writeFileSync(jsonPath, JSON.stringify(dataLayout));
    }
  );

  // Pass `false` in the layout parameter to generate an image layout
  // suitable for exporting to a PNG sprite image file.
  spritezero.generateLayout(
    {imgs: svgs, pixelRatio: pxRatio, format: false},
    (err, imageLayout) => {
      spritezero.generateImage(imageLayout, (err, image) => {
        if (err) {
          return;
        }
        fs.writeFileSync(pngPath, image);
      });
    }
  );
});
