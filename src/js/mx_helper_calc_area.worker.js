/* jshint esversion:6 */

import {combine,buffer,bboxClip, area} from "@turf/turf";
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
  var data = e.data;
  var out = 0;
  var g =  data.geojson;
  var featuresLength = g.features.length;
  // get all abject in one
  sendMessage("Extracting geometry from " + featuresLength + " features ...");

  sendMessage("Combine " + featuresLength + " features ...");
  g = combine(g);

  sendMessage("Calculating enveloppe ...");
  g = buffer(g,0);

  sendMessage("Clipping data to selected extent ..."); 
  g = bboxClip(g.features[0],data.bbox);

  sendMessage("Calculating area ...");
  out = area(g) * 1e-6;

  sendEnd(Math.round(out));

};
