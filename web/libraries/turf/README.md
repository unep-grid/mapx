# Build specific module for turf

Using the build.js, build a version with only needed module from turf.

- npm install @turf/bbox-clip @turf/meta @turf/bbox @turf/combine @turf/buffer @turf/intersect @turf/area @turf/bbox-polygon
- npm install -g browserify
- browserify build.js -s turf > turf.min.js


