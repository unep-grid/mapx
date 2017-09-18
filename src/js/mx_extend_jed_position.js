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

        var addPos, idMap, mapPos, divBtnPos, btnPos, btnLabel;
        /**
         * Add button to get position from a map
         */  

        if(this.options.addButtonPos) {
          addPos = function(){
            idMap =  self.options.idMap;
            if(!idMap) console.log("no id map provided in position editor as an option");
            mapPos = mx.helpers.getMapPos({id:idMap});
            self.setValue({
              z : mapPos.z,
              lat : mapPos.lat,
              lng : mapPos.lng,
              pitch : mapPos.p,
              bearing : mapPos.b
            });
          };
          divBtnPos = document.createElement("div");
          divBtnPos.className = "btn-group btn-group-wide";
          btnLabel = document.createElement("label");
          btnLabel.innerHTML = this.options.textButton;
          btnLabel.className += " control-label";
          btnPos = this.getButton("");
          btnPos.className += "fa fa-refresh";
          btnPos.onclick = addPos;
          divBtnPos.appendChild(btnLabel);
          divBtnPos.appendChild(btnPos);
        }
        /**
         * set layout
         */
        if(this.format === 'grid') {
          var rows = [];
          this.property_order.forEach(function(key,j) {
            var editor = self.editors[key];
            if(editor.property_removed) return;
            var found = false;
            var width = editor.options.hidden? 0 : (editor.options.grid_columns || editor.getNumColumns());
            var height = editor.options.hidden? 0 : editor.container.offsetHeight;
            // See if the editor will fit in any of the existing rows first
            for(var i=0; i<rows.length; i++) {
              // If the editor will fit in the row horizontally
              if(rows[i].width + width <= 12) {
                // If the editor is close to the other elements in height
                // i.e. Don't put a really tall editor in an otherwise short row or vice versa
                if(!height || (rows[i].minh*0.5 < height && rows[i].maxh*2 > height)) {
                  found = i;
                }
              }
            }

            // If there isn't a spot in any of the existing rows, start a new row
            if(found === false) {
              rows.push({
                width: 0,
                minh: 999999,
                maxh: 0,
                editors: []
              });
              found = rows.length-1;
            }

            rows[found].editors.push({
              key: key,
              //editor: editor,
              width: width,
              height: height
            });
            rows[found].width += width;
            rows[found].minh = Math.min(rows[found].minh,height);
            rows[found].maxh = Math.max(rows[found].maxh,height);
          });

          // Make almost full rows width 12
          // Do this by increasing all editors' sizes proprotionately
          // Any left over space goes to the biggest editor
          // Don't touch rows with a width of 6 or less
          for(i=0; i<rows.length; i++) {
            if(rows[i].width < 12) {
              var biggest = false;
              var new_width = 0;
              for(j=0; j<rows[i].editors.length; j++) {
                if(biggest === false) biggest = j;
                else if(rows[i].editors[j].width > rows[i].editors[biggest].width) biggest = j;
                rows[i].editors[j].width *= 12/rows[i].width;
                rows[i].editors[j].width = Math.floor(rows[i].editors[j].width);
                new_width += rows[i].editors[j].width;
              }
              if(new_width < 12) rows[i].editors[biggest].width += 12-new_width;
              rows[i].width = 12;
            }
          }

          // layout hasn't changed
          if(this.layout === JSON.stringify(rows)) return false;
          this.layout = JSON.stringify(rows);

          // Layout the form
          container = document.createElement('div');
          // last row = add position button
          for(i=0; i<rows.length; i++) {
            var row = this.theme.getGridRow();

            if(this.options.addButtonPos) {
              /**
               * Add button in first pos
               */
              container.appendChild(divBtnPos);
            }
            /*
             * Add row
             */
            container.appendChild(row);
            for(j=0; j<rows[i].editors.length; j++) {
              var key = rows[i].editors[j].key;
              var editor = this.editors[key];

              if(editor.options.hidden) editor.container.style.display = 'none'; 
              //else this.theme.setGridColumnSize(editor.container,rows[i].editors[j].width);
              else editor.container.className += " col-md-2";
              row.appendChild(editor.container);
            }
          }

        }
        // Normal layout
        else {
          container = document.createElement('div');
          jQuery.each(this.property_order, function(i,key) {
            var editor = self.editors[key];
            if(editor.property_removed) return;
            var row = self.theme.getGridRow();
            container.appendChild(row);

            if(editor.options.hidden) editor.container.style.display = 'none';
            else self.theme.setGridColumnSize(editor.container,12);
            row.appendChild(editor.container);
          });
        }
        this.row_container.innerHTML = '';
        this.row_container.appendChild(container);
      }
  }) ;
})();
