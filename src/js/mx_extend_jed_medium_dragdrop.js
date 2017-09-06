/*jshint esversion: 6 */

(function () {
    'use strict';

    var MediumEditor = require('medium-editor');
    var CLASS_DRAG_OVER = 'medium-editor-dragover';

    function clearClassNames(element) {
        var editable = MediumEditor.util.getContainerEditorElement(element),
            existing = Array.prototype.slice.call(editable.parentElement.querySelectorAll('.' + CLASS_DRAG_OVER));

        existing.forEach(function (el) {
            el.classList.remove(CLASS_DRAG_OVER);
        });
    }

    var FileDragging = MediumEditor.Extension.extend({
        name: 'fileDragging',

        allowedTypes: ['image'],

        init: function () {
            MediumEditor.Extension.prototype.init.apply(this, arguments);

            this.subscribe('editableDrag', this.handleDrag.bind(this));
            this.subscribe('editableDrop', this.handleDrop.bind(this));
        },

        handleDrag: function (event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';

            var target = event.target.classList ? event.target : event.target.parentElement;

            // Ensure the class gets removed from anything that had it before
            clearClassNames(target);

            if (event.type === 'dragover') {
                target.classList.add(CLASS_DRAG_OVER);
            }
        },

        handleDrop: function (event) {
            // Prevent file from opening in the current window
            event.preventDefault();
            event.stopPropagation();
            // Select the dropping target, and set the selection to the end of the target
            // https://github.com/yabwe/medium-editor/issues/980
            this.base.selectElement(event.target);
            var selection = this.base.exportSelection();
            selection.start = selection.end;
            
          this.base.importSelection(selection);
            // IE9 does not support the File API, so prevent file from opening in the window
            // but also don't try to actually get the file
            if (event.dataTransfer.files) {
              /*
              * Limit to one file : shiny remove some repeated events
              * and file are losts, but loading screens remain
              */
              var file = event.dataTransfer.files.item(0);

              if(this.isAllowedFile(file)){
                if (file.type.match('image')) {
                  this.insertImageFile(file);
                }
              }

            }

            // Make sure we remove our class from everything
            clearClassNames(event.target);
        },

        isAllowedFile: function (file) {
            return this.allowedTypes.some(function (fileType) {
                return !!file.type.match(fileType);
            });
        },

        insertImageFile: function (file) {
            if (typeof FileReader !== 'function') {
                return;
            }
            var fileReader = new FileReader();
            fileReader.readAsDataURL(file);

            // attach the onload event handler, makes it easier to listen in with jasmine
            fileReader.addEventListener('load', function (e) {
              var mx = require('./mx_helper_misc.js');
              var selectedParent = this.base.getSelectedParentElement();
              var img = new Image();
              var p = document.createElement('p');
              var span = document.createElement('span');
              var id = mx.helper.makeId(10);
              img.id = id;
              span.innerHTML = "[" + mx.helper.getLanguage(["loading_img"]) + " ]";
              p.appendChild(img);
              p.appendChild(span);
              var base = this.base;
 
              img.onload = function(){
                span.remove();
                base.checkContentChanged(base.elements[0]);
              };
             
              selectedParent.appendChild(p);

              Shiny.onInputChange("imageUpload",{
                img : e.target.result,
                id : id
              });

            }.bind(this));
        }
    });

    MediumEditor.extensions.fileDragging = FileDragging;


}());
