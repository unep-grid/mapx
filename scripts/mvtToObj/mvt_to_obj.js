var fs = require("fs");
var Pbf = require("pbf");
// module created with 'pbf vector_tile.proto > vector_tile.js'
var Tile = require("./vector_tile.js").Tile;


function mvtToObj(path){
   var buff = fs.readFileSync(path);
   var pbf = new Pbf(buff);
   return Tile.read(pbf);
}


if(process.argv[2]){
 console.log(JSON.stringify(mvtToObj(process.argv[2])));
}
