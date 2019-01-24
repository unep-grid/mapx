/*jshint esversion: 6 , node: true */



export function jsonPreview(json,options){
   return Promise.all([
    import("json-formatter-js"),
   ])
  .then(m => {
    var JSONFormatter = m[0].default;
    var formatted = new JSONFormatter(json,options);
    return formatted.render();
  });
}

export function jsonDiff(a,b,opt){
  opt = opt || {};
  return Promise.all([
    import("jsondiffpatch"),
    import("../../node_modules/jsondiffpatch/dist/formatters-styles/html.css")
  ])
    .then(m => {
      var jsondiffpatch = m[0];
      var instance = jsondiffpatch.create({
        arrays: {
          detectMove: true,
          includeValueOnMove: false
        },
        textDiff: {
          minLength: 60
        },
        propertyFilter: opt.propertyFilter instanceof Function ? opt.propertyFilter : null,
        cloneDiffValues: false 
      });

      var delta = instance.diff(a, b);

      if(opt.toHTML){
        jsondiffpatch.formatters.html.hideUnchanged();
        return jsondiffpatch.formatters.html.format(delta, a);
      }
      return delta;
    });
}
