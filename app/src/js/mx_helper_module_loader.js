


export function moduleLoad(name){
  "use strict";
  switch(name){
    case "topojson":
      return System.import("topojson-client");
    case "d3" :
      return System.import("d3");
    case "d3-geo" :
      return System.import("d3-geo");
    case "highcharts" :
      return Promise.all([
        System.import("highcharts"),
        System.import("highcharts-more"),
        System.import("highcharts-solid-gauge")
      ])
        .then(m => {
          m[1](m[0]);
          m[2](m[0]);
          return Promise.resolve(m[0]);
        });
    default:
      return Promise.resolve({});
  }
}

export function modulesLoad(arr){
  arr =  arr || [];

  arr = arr.map(m => moduleLoad(m));

  return Promise.all(arr);

}
