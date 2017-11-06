/*jshint esversion: 6 , node: true */
//'use strict';



/**
 * Add an event listener on a text input and filter views list by id
 * @param {Object} o Options 
 * @param {String || Element} o.selectorInput Selector string or element
 * @param {String} o.idMap Id of the map containing the views
 * @param {String} o.classHide Class used to hide filted result
 * @param {String} o.classSkip Class used to skip element. If the element has this, it will be skiped
 * @param {Function} o.onFiltered Callback function when the list is filtered 
 */
export function filterViewsListText(o){

  var selectorInput = o.selectorInput;
  var idMap = o.idMap;
  var onFiltered = o.onFiltered;
  var classHide = o.classHide;
  var classSkip = o.classSkip;
  var elInput = (selectorInput instanceof Node) ? selectorInput : document.querySelector(selectorInput);

  var listener =  function() {

    var views = mx.maps[idMap].views;
    if( !views || this.value === undefined ) return;

    var lang = mx.settings.language;
    var search = this.value.toLowerCase();
    var displayAll =  !search;

    for (var i = 0, iL = views.length; i < iL; i++) {
      var found = true;
      var v = views[i];
      var el = document.getElementById(v.id);

      if(el){
        var hasSkip = el.classList.contains(classSkip);
        if( !hasSkip ){
          if( displayAll ){
            el.classList.remove( classHide );
          }else{
            var txt = mx.helpers.getLanguageFromObjectPath({
              obj: v,
              path: "data.title",
              lang: mx.settings.language,
              defaultKey : ""
            }) +
              mx.helpers.getLanguageFromObjectPath({
                obj: v,
                path: "data.abstract",
                lang: mx.settings.language,
                defaultKey : ""
              });

            try{
              found = txt.toLowerCase().indexOf(search)>-1;
            }
            catch(e){
              found = true;
            }

            if(found){
              el.classList.remove(classHide);
            }else{
              el.classList.add(classHide);
            }
          }
        }
      }
    }
    if( onFiltered && onFiltered instanceof Function ) onFiltered();
  };

  elInput.addEventListener("keyup", listener);
  return listener;
}

/**
 * Add an event listener on a checkbox group input and filter views list by id
 * @param {Object} o Options 
 * @param {String || Element} o.selectorInput Selector string or element
 * @param {String} o.idMap Id of the map containing the views
 * @param {String} o.classHide Class used to hide filted result
 * @param {String} o.classSkip Class used to skip element. If the element has this, it will be skiped
 * @param {Function} o.onFiltered Callback function when the list is filtered 
 */
export function filterViewsListCheckbox(o){

  var selectorInput = o.selectorInput;
  var idMap = o.idMap;
  var onFiltered = o.onFiltered;
  var elInput = (selectorInput instanceof Node) ? selectorInput : document.querySelector(selectorInput);
  var classHide = o.classHide;
  var classSkip = o.classSkip;
  var listener = function() {
    
    var elFilter ;
    var views = mx.maps[idMap].views;
    if(!views) return;
    var lang = mx.settings.language;
    var elFilters = elInput.querySelectorAll(".filter");
    var filters = [];

    for( var f = 0, fL = elFilters.length ; f < fL ; f++ ){
      elFilter = elFilters[f];
      if(elFilter.checked) filters.push({
        filter:elFilter.dataset.filter,
        type:elFilter.dataset.type
      });
    }

    var displayAll = filters.length == 0;

    for (var i = 0, iL = views.length; i < iL; i++) {
      var found = false;
      var v = views[i];
      var el = document.getElementById(v.id);
      if(el){
        var hasFilterText = el.classList.contains(classSkip);
        if(!hasFilterText){
          if(displayAll){
            el.classList.remove(classHide);
          }else{ 

            for(var j = 0, jL=filters.length ; j < jL ; j++ ){
              if( ! found ){ 
                var filter = filters[j].filter;
                var type = filters[j].type;
                try{
                  switch(type){
                    case  "classes" :
                      found = v.data.classes.indexOf(filter) > -1;
                      break;
                    case  "collections" :
                      found = v.data.collections.indexOf(filter) > -1; 
                      break;
                    case  "type" :
                      found = v.type.indexOf(filter) > -1 ;
                      break;               
                    default:
                      found = false;
                  }
                }catch(e){}
              }
            }
            if(found){
              el.classList.remove(classHide);
            }else{
              el.classList.add(classHide);
            }
          }
        }
      }
    }
    if( onFiltered && onFiltered instanceof Function ) onFiltered();
  };

  elInput.addEventListener("click",listener);
  return listener;

}




