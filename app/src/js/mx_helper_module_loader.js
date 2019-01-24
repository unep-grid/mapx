
const modules = {
  "topojson": import("topojson-client"),
  "d3" : import("d3"),
  "d3-geo" : import("d3-geo"),
  "hightcharts" :  Promise.all([
    import("highcharts"),
    import("highcharts-more"),
    import("highcharts-solid-gauge")
  ])
  .then(m => {
    m[1].default(m[0]);
    m[2].default(m[0]);
    return Promise.resolve(m[0]);
  }),
  "json-editor" : import("json-editor")
  .then(m => {
    return Promise.all([
      import('../css/mx_jed.css'),
      import("./mx_extend_jed_position.js"),
      import("./mx_extend_jed_ace.js"),
      import("./mx_extend_jed_pickolor.js"),
      /***
      * Global plugin for all editors.
      */
      moduleLoad('selectize')
    ]);
  }),
  "selectize" : Promise.all([
    import('selectize'),
    import('webpack-jquery-ui/sortable'),
    import('selectize/dist/css/selectize.css'),
    import('selectize/dist/css/selectize.bootstrap3.css'),
    import('../css/mx_selectize.css')
  ]).then(m => {
    var Selectize  = m[0].default;
    window.Selectize = Selectize;
    return Selectize; 
  }),
  "pickolor" : Promise.all([
     import("../js/pickolor/pickolor.js"),
     import("../js/pickolor/pickolor.css")
  ])
  .then(m => {
    var Pickolor  = m[0].default;
    return Pickolor;
  }),
  "nouislider" : Promise.all([
    import("nouislider"),
    import("../../node_modules/nouislider/distribute/nouislider.css")
  ])
};

export function moduleLoad(name){
  const module = modules[name];
  if(!module) return Promise.resolve({});
  return module;
}

export function modulesLoad(arr){
  arr =  arr || [];
  arr = arr.map(m => moduleLoad(m));
  return Promise.all(arr);
}
