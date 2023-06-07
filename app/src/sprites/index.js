import spritezero from "@mapbox/spritezero";
import fs from "fs/promises";
import glob from "glob";
import path from "path";
import SVGO from "svgo";
const config = JSON.parse(fs.readFileSync("config.json"));

const dirOut = path.resolve(process.cwd(), config.out);
const dirOutSvg = path.join(dirOut, "svg");
const dirOutFonts = path.join(dirOut, "fontstack");
const dirOutSprites = path.join(dirOut, "sprites");
const dirOutFontSvg = path.join(dirOutFonts, config.fontNameSvg);

convert().catch((e) => console.error(e));

async function convert() {
  await init();
  await optimizeSvg();
  await makeSprites();
}

async function init() {
  await mkdirSync(dirOutSvg);
  await mkdirSync(dirOutFonts);
  await mkdirSync(dirOutSprites);
  await mkdirSync(dirOutFontSvg);
}

async function optimizeSvg() {
  const svgo = new SVGO();

  /**
   * SVG optimisation
   */
  const svgs = glob.sync(config.svgs).map((f) => {
    return {
      svg: fs.readFileSync(f),
      id: path.basename(f).replace(".svg", ""),
      name: path.basename(f),
    };
  });

  for (const svg of svgs) {
    const r = await svgo.optimize(svg.svg);
    const svgPath = path.join(dirOutSvg, svg.name);
    await fs.writeFile(svgPath, r.data);
  }
}

/*
 * Make sprites
 */
async function makeSprites() {
  for (const pxRatio of config.ratios) {
    const rbase = pxRatio === 1;
    const pngPath = path.join(
      dirOutSprites,
      rbase ? `sprite.png` : `sprite@${pxRatio}x.png`
    );
    const jsonPath = path.join(
      dirOutSprites,
      rbase ? `sprite.json` : `sprite@${pxRatio}x.json`
    );

    const dataLayout = await new Promise((resolve, reject) => {
      spritezero.generateLayout(
        { imgs: svgs, pixelRatio: pxRatio * 2, format: true },
        (err, dataLayout) => {
          if (err) reject(err);
          resolve(dataLayout);
        }
      );
    });

    for (const i in dataLayout) {
      dataLayout[i].sdf = true;
    }
    await fs.writeFile(jsonPath, JSON.stringify(dataLayout));

    const imageLayout = await new Promise((resolve, reject) => {
      spritezero.generateLayout(
        { imgs: svgs, pixelRatio: pxRatio * 2, format: false },
        (err, imageLayout) => {
          if (err) reject(err);
          resolve(imageLayout);
        }
      );
    });

    const image = await new Promise((resolve, reject) => {
      spritezero.generateImage(imageLayout, (err, image) => {
        if (err) reject(err);
        resolve(image);
      });
    });

    await fs.writeFile(pngPath, image);
  }
}

async function mkdirSync(dir) {
  try {
    if (!(await fs.stat(dir)).isDirectory()) {
      await fs.mkdir(dir);
    }
  } catch (e) {
    await fs.mkdir(dir);
  }
}
