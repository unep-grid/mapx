const spritezero = require('@mapbox/spritezero');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const zlib = require('zlib');
const SVGO = require('svgo');
const webfont = require('webfont').default;
const fontmachine = require('fontmachine');

const svgo = new SVGO();

const config = JSON.parse(fs.readFileSync('config.json'));
const dirOut = path.resolve(__dirname, config.out);
const dirOutSvg = path.join(dirOut, 'svg');
const dirOutFonts = path.join(dirOut, 'fontstack');
const dirOutSprites = path.join(dirOut, 'sprites');
const dirOutFontSvg = path.join(dirOutFonts, config.fontNameSvg);

mkdirSync(dirOutSvg);
mkdirSync(dirOutFonts);
mkdirSync(dirOutSprites);
mkdirSync(dirOutFontSvg);

/**
 * SVG optimisation
 */
const svgs = glob.sync(config.svgs).map((f) => {
  return {
    svg: fs.readFileSync(f),
    id: path.basename(f).replace('.svg', ''),
    name: path.basename(f)
  };
});

svgs.forEach((svg) => {
  svgo.optimize(svg.svg).then((r) => {
    const svgPath = path.join(dirOutSvg, svg.name);
    fs.writeFileSync(svgPath, r.data);
  });
});

/**
 * Convert fonts to pbf
 */

glob.sync(config.ttfs).forEach((f) => {
  const fontData = {
    ttf: fs.readFileSync(f),
    id: path.basename(f).replace('.ttf', ''),
    name: path.basename(f)
  };
  fontmachine.makeGlyphs(
    {font: fontData.ttf, filetype: '.ttf'},
    (err, font) => {
      if (err) {
        throw err;
      }
      font.stack.forEach((stack) => {
        const outFontDir = path.join(dirOutFonts, fontData.id);
        mkdirSync(outFontDir);
        const fontPath = path.join(outFontDir, stack.name);
        zlib.gunzip(stack.data, (err, data) => {
          if (err) {
            throw err;
          }
          fs.writeFileSync(fontPath, data);
        });
      });
    }
  );
});

/**
 * Make pbf glyph from svgs and fonts
 */
webfont({
  files: config.svgs,
  fontName: config.fontNameSvg,
  fontHeight: 144
})
  .then((fontData) => {
    /**
     * Save a version of the font for illustration
     */
    const fontPath = path.join(dirOutFontSvg, `${config.fontNameSvg}.ttf`);
    fs.writeFileSync(fontPath, fontData.ttf);

    /**
     * Convert to pbf
     */
    return new Promise((resolve, reject) => {
      fontmachine.makeGlyphs(
        {font: fontData.ttf, filetype: '.ttf'},
        (err, font) => {
          if (err) {
            reject(err);
          }
          resolve(font);
        }
      );
    });
  })
  .then((font) => {
    font.stack.forEach((stack) => {
      const fontPath = path.join(dirOutFontSvg, stack.name);
      zlib.gunzip(stack.data, (err, data) => {
        if (err) {
          throw err;
        }
        fs.writeFileSync(fontPath, data);
      });
    });
  })
  .catch((error) => {
    throw error;
  });

/*
 * Make sprites
 */
config.ratios.forEach((pxRatio) => {
  const rbase = pxRatio === 1;
  const pngPath = path.join(
    dirOutSprites,
    rbase ? `sprite.png` : `sprite@${pxRatio}x.png`
  );
  const jsonPath = path.join(
    dirOutSprites,
    rbase ? `sprite.json` : `sprite@${pxRatio}x.json`
  );

  spritezero.generateLayout(
    {imgs: svgs, pixelRatio: pxRatio, format: true},
    (err, dataLayout) => {
      if (err) {
        return;
      }
      for (var i in dataLayout) {
        dataLayout[i].sdf = true;
      }
      fs.writeFileSync(jsonPath, JSON.stringify(dataLayout));
    }
  );

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




function mkdirSync(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  } catch (e) {}
}
