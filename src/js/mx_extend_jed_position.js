/*
 * mx_extend_jed_position.js
 * Copyright (C) 2017 fxi <fxi@mbp-fxi.home>
 *
 * Distributed under terms of the MIT license.
 */
(function(){
  'use strict';


  /**
   * Set a resolver for the map position format
   */
  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if(schema.type === "object" && schema.format === "position") {
      return "position";
    }
  });

  JSONEditor.defaults.editors.position = JSONEditor.defaults.editors.object.extend({
    layoutEditors : function() {

      var self = this, i, j;

      if(!this.row_container) return;

      var container; 
      var addPos, idMap, mapPos, divBtnPos, btnPos, btnLabel, btnIcon;

      container = document.createElement('div');
      /**
       * Add button to get position from a map
       */  

      if( this.options.addButtonPos ){
        addPos = function(){
          idMap =  self.options.idMap;
          if(!idMap) console.log("no id map provided in position editor as an option");
          mapPos = mx.helpers.getMapPos({id:idMap});
          self.setValue({
            z : mapPos.z,
            lat : mapPos.lat,
            lng : mapPos.lng,
            pitch : mapPos.p,
            bearing : mapPos.b,
            n : mapPos.n,
            s : mapPos.s,
            e : mapPos.e,
            w : mapPos.w
          });
        };
        btnPos = document.createElement("button");
        btnPos.type = "button";
        btnPos.className += "btn btn-default";

        btnIcon = document.createElement("i");
        btnIcon.className = "fa fa-refresh";
        btnLabel = document.createTextNode(this.options.textButton);
        btnPos.appendChild(btnIcon);
        btnPos.appendChild(btnLabel);
        btnPos.onclick = addPos;
        container.appendChild(btnPos);
      }
      /**
       * set layout
       */
      
      jQuery.each(this.property_order, function(i,key) {
        var editor = self.editors[key];
        if(editor.property_removed) return;
        var row = self.theme.getGridRow();
        container.appendChild(row);

        if(editor.options.hidden) editor.container.style.display = 'none';
        else self.theme.setGridColumnSize(editor.container,12);
        row.appendChild(editor.container);
      });
      this.row_container.innerHTML = '';
      this.row_container.appendChild(container);
    }
  }) ;
})();
