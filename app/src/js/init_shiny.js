
System.import('jquery')
  .then(function(jQuery){
    window.$ = window.jQuery = jQuery;
    return Promise.all([
      System.import('selectize'),
      System.import('./shiny.min.js'),
      System.import('./mx_binding_helper.js'),
      System.import('./mx_binding_pwd.js')
    ]);
  })
  .then(function(m){
    window.Selectize = m[0];
    console.log("APP MODE");
  });






