var fs = require('fs');
var textures = require('textures');
var d3 = require('d3');
var jsdom = require('jsdom');
var {JSDOM} = jsdom;
var path = require('path');
var config = JSON.parse(fs.readFileSync('./config.json'));

var patterns = [];
var outDirSvg = path.resolve(config.out);

/*
 * Make dir if needed
 */
mkdirSync(outDirSvg);

/*
 * lines
 */

/* For each colors, angles i, for each stroke j, generate texture
 *
 *  strokeWidth = line width
 *  size = total size. Here we use a multiplier based on angle
 *         to get more constitant sizinconfig.
 *
 */
Object.keys(config.colors).forEach(function(c) {
  config.linesAngles.forEach(function(i) {
    var n = 0;
    config.linesStrokeWidth.forEach(function(j) {
      n++;
      var dynSize = config.baseSize * config.linesSize[i];
      var p = [
        {
          name: 't_' + c + '_lines_' + i + n,
          texture: textures
            .lines()
            .orientation(i + '/8')
            .size(dynSize)
            .strokeWidth(j)
            .stroke(config.colors[c])
        }
      ];
      patterns = patterns.concat(p);
    });
  });
});

/*
 * circles
 */
Object.keys(config.colors).forEach(function(c) {
  config.circlesRadius.forEach(function(i) {
    var p = [
      {
        name: 't_' + c + '_circles_a' + i,
        texture: textures
          .circles()
          .radius(i)
          .size(config.baseSize + 2)
          .stroke(config.colors[c])
          .fill(config.colors[c])
      },
      {
        name: 't_' + c + '_circles_b' + i,
        texture: textures
          .circles()
          .radius(i)
          .complement()
          .size(config.baseSize + 2)
          .stroke(config.colors[c])
          .fill(config.colors[c])
      }
    ];

    patterns = patterns.concat(p);
  });
});

/*
 *  Paths
 */
Object.keys(config.colors).forEach(function(c) {
  config.pathsType.forEach(function(t) {
    config.pathsStrokeWidth.forEach(function(s) {
      var p = [
        {
          name: 't_' + c + '_' + t + '_0' + s,
          texture: textures
            .paths()
            .d(t)
            .size(10)
            .strokeWidth(s)
            .stroke(config.colors[c])
        }
      ];
      patterns = patterns.concat(p);
    });
  });
});
/*
 * Extract patterns
 */
const dom = new JSDOM();
patterns.forEach(function(x) {
  // out svg file
  var outFile = path.join(outDirSvg, x.name + '.svg');
  var window = dom.window;
  window.d3 = d3.select(window.document);
  // add a svg in body
  var texture = window.d3.select('body').append('svg');
  // produce texture
  texture.call(x.texture);
  // extract path
  var pat = texture.select('pattern');
  // get computed width
  var size = pat.attr('width');
  // set html output.
  var out = window.document.createElement('svg');
  out.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  out.setAttribute('version', '1.1');
  out.setAttribute('width', size);
  out.setAttribute('height', size);
  out.innerHTML = pat.html();
  fs.writeFileSync(outFile, out.outerHTML);
  out.remove();
  texture.remove();
  console.log(x.name);
});

/**
 * create directory of output
 * @param path {string} Path of the directory
 * @return null
 */
function mkdirSync(dir) {
  try {
    fs.mkdirSync(dir);
  } catch (e) {}
}
