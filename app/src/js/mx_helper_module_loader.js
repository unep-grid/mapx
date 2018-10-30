


export function moduleLoad(name){
  "use strict";
  switch(name){
    case "topojson":
      return import("topojson-client");
    case "d3" :
      return import("d3");
    case "d3-geo" :
      return import("d3-geo");
    case "highcharts" :
      return Promise.all([
        import("highcharts"),
        import("highcharts-more"),
        import("highcharts-solid-gauge")
      ])
        .then(m => {
          m[1].default(m[0]);
          m[2].default(m[0]);
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
