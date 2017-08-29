
var fs = require("fs");
var UglifyJS = require("uglify-js");
var path = require("path");
var p = function(p){return fs.readFileSync(path.join(__dirname,'src/'+p),"utf8");};
var outFile = path.join(__dirname,"dist/app.min.js");

var inFile = [
    p("localForage/localforage.min.js"),
    p("nouislider/nouislider.min.js"),
    p("jszip/jszip.min.js"),
    p("cookies/cookies.min.js"),
    p("mapbox-gl/mapbox-gl.js"),
    p("list/list.min.js"),
    p("fullscreen/fullscreen.js"),
    p("dot/doT.min.js"),
    p("turf/turf.min.js"),
    p("shapefile/shapefile.js"),
    p("toGeoJSON/togeojson.js"),
    p("toKml/tokml.js"),
    p("download/download.min.js"),
    p("mapx/mx_pwd.js"),
    p("mapx/mx_cookies.js"),
    p("mapx/mx_fullscreen.js"),
    p("choices/choices.min.js"),
    p("selectize/selectize.min.js"),
    p("mapx/mx.js"),
    p("mapx/mx_diacritics_table.js"),
    p("mapx/mgl.js"),
    p("mapx/mgl_drop.js"),
    p("mapx/mx_story.js")
  ];


var result = UglifyJS.minify(inFile,{
  mangle : false,
  compress : false
});

fs.writeFile(outFile, result.code, function(err) {
  if(err) {
    return console.log(err);
  }
}); 



