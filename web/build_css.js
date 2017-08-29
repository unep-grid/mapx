  
var fs = require('fs');
var CleanCSS = require('clean-css');
var outFile = "dist/app.min.css";
var outFileColors = "dist/app.colors.min.css";

var inFile =  [ 
  "src/fontawesome/css/font-awesome.min.css",
  "src/selectize/selectize.css",
  "src/selectize/selectize.bootstrap3.css",
  "src/choices/choices.min.css",
  "src/hint/hint.min.css",
  "src/mapbox-gl/mapbox-gl.css",
  "src/bootstrap/bootstrap.min.css",
  "src/nouislider/nouislider.min.css",
  "src/mapx/mx.css",
  "src/mapx/mx_legends.css",
  "src/mapx/mx_story.css"
];

var inFileColors =  [ 
  "src/mapx/mx_colors.css"
];

var result = new CleanCSS({target:outFile,rebaseTo:'dist'}).minify(inFile);
var resultColors = new CleanCSS({target:outFileColors,rebaseTo:'dist'}).minify(inFileColors);

fs.writeFile(outFile, result.styles, function(err) {
  if(err) {
    return console.log(err);
  }
  console.log("Writing " + outFile + " done !\n" + "Input files:",inFile);
}); 

fs.writeFile(outFileColors, resultColors.styles, function(err) {
  if(err) {
    return console.log(err);
  }
  console.log("Writing " + outFileColors + " done !\n" + "Input files:",inFileColors);
}); 






