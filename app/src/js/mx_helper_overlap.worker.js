import intersect from "@turf/intersect";
import buffer from "@turf/buffer";
import combine from "@turf/combine";
import booleanOverlap from "@turf/boolean-overlap";



function sendMessage(m){postMessage({message:m});}
function sendProgress(m){postMessage({progress:m});}
function sendEnd(m){postMessage({end:m});}

// Inital message
postMessage({
  progress: 0,
  message: "start"
});


// handle message send from the main thread
onmessage = function(e) {



  var out;
  var data = e.data;
  var featsLayers = data.featsLayers;

  var a,b,fCol,fComb,fBuff,polyOut;

  featsLayers.forEach(function(fg){
    fCol = featureCollection(fg.features);
    fComb = combine(fCol);
    fComb.features[0].properties = { id: fg.layer };
    fBuff = buffer(fComb.features[0],0);
    fg.poly = fBuff;
  });

  if( featsLayers.length === 2 ){

    a = featsLayers[0].poly;
    b = featsLayers[1].poly;

    console.log(JSON.stringify(a));
    console.log(JSON.stringify(b));

    out = intersect(a,b);

  }else{

    out = featsLayers.reduce(function(a, b ){
      return {poly:intersect(a.poly,b.poly)};
    });

  }

  sendEnd(featureCollection([out]));

};



function featureCollection(a){
  return {
    "type": "FeatureCollection",
    "features": a
  };
}
