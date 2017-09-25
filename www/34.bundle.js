webpackJsonp([34],{

/***/ 87:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*
 * mx_extend_jed_medium.js
 * Copyright (C) 2017 fxi <fxi@mbp-fxi.home>
 *
 * Distributed under terms of the MIT license.
 */
(function () {
  'use strict';

  JSONEditor.defaults.resolvers.unshift(function (schema) {
    if (schema.type === "string" && schema.format === "medium") {
      return "medium";
    }
  });

  JSONEditor.defaults.editors.medium = JSONEditor.defaults.editors.string.extend({
    setValue: function setValue(value, initial, from_template) {
      var self = this;

      if (this.template && !from_template) {
        return;
      }

      if (value === null || typeof value === 'undefined') value = "";else if ((typeof value === "undefined" ? "undefined" : _typeof(value)) === "object") value = JSON.stringify(value);else if (typeof value !== "string") value = "" + value;

      if (value === this.serialized) return;

      // Sanitize value before setting it
      var sanitized = this.sanitize(value);

      if (this.input.value === sanitized) {
        return;
      }

      this.input.value = sanitized;

      if (this.medium_editor) {
        this.medium_editor.setContent(sanitized);
      }

      var changed = from_template || this.getValue() !== value;

      this.refreshValue();

      if (initial) this.is_dirty = false;else if (this.jsoneditor.options.show_errors === "change") this.is_dirty = true;

      if (this.adjust_height) this.adjust_height(this.input);

      // Bubble this setValue to parents if the value changed
      this.onChange(changed);
    },
    afterInputReady: function afterInputReady() {

      var self = this,
          options;

      // Code editor
      if (!self.options.hidden) {

        Promise.all([__webpack_require__.e/* import() */(24).then(__webpack_require__.bind(null, 169)), __webpack_require__.e/* import() */(27).then(__webpack_require__.bind(null, 473)), __webpack_require__.e/* import() */(26).then(__webpack_require__.bind(null, 475)), __webpack_require__.e/* import() */(25).then(__webpack_require__.bind(null, 477)), __webpack_require__.e/* import() */(23).then(__webpack_require__.bind(null, 479))]).then(function (m) {
          var MediumEditor = m[0];

          self.medium_container = document.createElement("div");
          self.medium_container.innerHTML = self.input.value;

          self.input.parentNode.insertBefore(self.medium_container, self.input);
          self.input.style.display = 'none';

          self.medium_editor = new MediumEditor(self.medium_container, {
            buttonLabels: "fontawesome",
            toolbar: {
              buttons: ['h1', 'h2', 'h3', 'bold', 'italic', 'quote', 'anchor', 'unorderedlist']
            }
          });

          self.medium_editor.setContent(self.getValue());

          self.medium_editor.subscribe('editableInput', function (event, editable) {
            self.input.value = editable.innerHTML;
            self.refreshValue();
            self.is_dirty = true;
            self.onChange(true);
          });
        });
      }

      self.theme.afterInputReady(self.input);
    },
    destroy: function destroy() {
      if (this.medium_editor) {
        this.medium_editor.destroy();
      }
    }

  });
})();

/***/ })

});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9zcmMvanMvbXhfZXh0ZW5kX2plZF9tZWRpdW0uanMiXSwibmFtZXMiOlsiSlNPTkVkaXRvciIsImRlZmF1bHRzIiwicmVzb2x2ZXJzIiwidW5zaGlmdCIsInNjaGVtYSIsInR5cGUiLCJmb3JtYXQiLCJlZGl0b3JzIiwibWVkaXVtIiwic3RyaW5nIiwiZXh0ZW5kIiwic2V0VmFsdWUiLCJ2YWx1ZSIsImluaXRpYWwiLCJmcm9tX3RlbXBsYXRlIiwic2VsZiIsInRlbXBsYXRlIiwiSlNPTiIsInN0cmluZ2lmeSIsInNlcmlhbGl6ZWQiLCJzYW5pdGl6ZWQiLCJzYW5pdGl6ZSIsImlucHV0IiwibWVkaXVtX2VkaXRvciIsInNldENvbnRlbnQiLCJjaGFuZ2VkIiwiZ2V0VmFsdWUiLCJyZWZyZXNoVmFsdWUiLCJpc19kaXJ0eSIsImpzb25lZGl0b3IiLCJvcHRpb25zIiwic2hvd19lcnJvcnMiLCJhZGp1c3RfaGVpZ2h0Iiwib25DaGFuZ2UiLCJhZnRlcklucHV0UmVhZHkiLCJoaWRkZW4iLCJQcm9taXNlIiwiYWxsIiwidGhlbiIsIm0iLCJNZWRpdW1FZGl0b3IiLCJtZWRpdW1fY29udGFpbmVyIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiaW5uZXJIVE1MIiwicGFyZW50Tm9kZSIsImluc2VydEJlZm9yZSIsInN0eWxlIiwiZGlzcGxheSIsImJ1dHRvbkxhYmVscyIsInRvb2xiYXIiLCJidXR0b25zIiwic3Vic2NyaWJlIiwiZXZlbnQiLCJlZGl0YWJsZSIsInRoZW1lIiwiZGVzdHJveSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBOzs7Ozs7QUFNQSxDQUFDLFlBQVU7QUFDVDs7QUFFQUEsYUFBV0MsUUFBWCxDQUFvQkMsU0FBcEIsQ0FBOEJDLE9BQTlCLENBQXNDLFVBQVNDLE1BQVQsRUFBaUI7QUFDckQsUUFBR0EsT0FBT0MsSUFBUCxLQUFnQixRQUFoQixJQUE0QkQsT0FBT0UsTUFBUCxLQUFrQixRQUFqRCxFQUEy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RmlELFdBQXZDLENBQXJCOztBQU9BcEMsZUFBS1EsYUFBTCxDQUFtQkMsVUFBbkIsQ0FBOEJULEtBQUtXLFFBQUwsRUFBOUI7O0FBRUFYLGVBQUtRLGFBQUwsQ0FBbUI2QixTQUFuQixDQUE2QixlQUE3QixFQUE4QyxVQUFVQyxLQUFWLEVBQWlCQyxRQUFqQixFQUEyQjtBQUN2RXZDLGlCQUFLTyxLQUFMLENBQVdWLEtBQVgsR0FBbUIwQyxTQUFTVixTQUE1QjtBQUNBN0IsaUJBQUtZLFlBQUw7QUFDQVosaUJBQUthLFFBQUwsR0FBZ0IsSUFBaEI7QUFDQWIsaUJBQUtrQixRQUFMLENBQWMsSUFBZDtBQUNELFdBTEQ7QUFPRCxTQS9CRDtBQWlDRDs7QUFFRGxCLFdBQUt3QyxLQUFMLENBQVdyQixlQUFYLENBQTJCbkIsS0FBS08sS0FBaEM7QUFDRCxLQWxGMEU7QUFtRjdFa0MsYUFBUyxtQkFBVztBQUNsQixVQUFHLEtBQUtqQyxhQUFSLEVBQXVCO0FBQ3JCLGFBQUtBLGFBQUwsQ0FBbUJpQyxPQUFuQjtBQUNEO0FBQ0Y7O0FBdkY0RSxHQUExQyxDQUFyQztBQTRGRCxDQXJHRCxJIiwiZmlsZSI6IjM0LmJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBteF9leHRlbmRfamVkX21lZGl1bS5qc1xuICogQ29weXJpZ2h0IChDKSAyMDE3IGZ4aSA8ZnhpQG1icC1meGkuaG9tZT5cbiAqXG4gKiBEaXN0cmlidXRlZCB1bmRlciB0ZXJtcyBvZiB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cbihmdW5jdGlvbigpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgSlNPTkVkaXRvci5kZWZhdWx0cy5yZXNvbHZlcnMudW5zaGlmdChmdW5jdGlvbihzY2hlbWEpIHtcbiAgICBpZihzY2hlbWEudHlwZSA9PT0gXCJzdHJpbmdcIiAmJiBzY2hlbWEuZm9ybWF0ID09PSBcIm1lZGl1bVwiKSB7XG4gICAgICByZXR1cm4gXCJtZWRpdW1cIjtcbiAgICB9XG4gIH0pO1xuXG4gIEpTT05FZGl0b3IuZGVmYXVsdHMuZWRpdG9ycy5tZWRpdW0gPSBKU09ORWRpdG9yLmRlZmF1bHRzLmVkaXRvcnMuc3RyaW5nLmV4dGVuZCh7XG4gIHNldFZhbHVlOiBmdW5jdGlvbih2YWx1ZSxpbml0aWFsLGZyb21fdGVtcGxhdGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgaWYodGhpcy50ZW1wbGF0ZSAmJiAhZnJvbV90ZW1wbGF0ZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICBpZih2YWx1ZSA9PT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnKSB2YWx1ZSA9IFwiXCI7XG4gICAgZWxzZSBpZih0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIpIHZhbHVlID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgIGVsc2UgaWYodHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiKSB2YWx1ZSA9IFwiXCIrdmFsdWU7XG4gICAgXG4gICAgaWYodmFsdWUgPT09IHRoaXMuc2VyaWFsaXplZCkgcmV0dXJuO1xuXG4gICAgLy8gU2FuaXRpemUgdmFsdWUgYmVmb3JlIHNldHRpbmcgaXRcbiAgICB2YXIgc2FuaXRpemVkID0gdGhpcy5zYW5pdGl6ZSh2YWx1ZSk7XG5cbiAgICBpZih0aGlzLmlucHV0LnZhbHVlID09PSBzYW5pdGl6ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmlucHV0LnZhbHVlID0gc2FuaXRpemVkO1xuXG4gICAgaWYodGhpcy5tZWRpdW1fZWRpdG9yKXtcbiAgICAgICAgdGhpcy5tZWRpdW1fZWRpdG9yLnNldENvbnRlbnQoc2FuaXRpemVkKTtcbiAgICB9XG4gICBcbiAgICB2YXIgY2hhbmdlZCA9IGZyb21fdGVtcGxhdGUgfHwgdGhpcy5nZXRWYWx1ZSgpICE9PSB2YWx1ZTtcbiAgICBcbiAgICB0aGlzLnJlZnJlc2hWYWx1ZSgpO1xuICAgIFxuICAgIGlmKGluaXRpYWwpIHRoaXMuaXNfZGlydHkgPSBmYWxzZTtcbiAgICBlbHNlIGlmKHRoaXMuanNvbmVkaXRvci5vcHRpb25zLnNob3dfZXJyb3JzID09PSBcImNoYW5nZVwiKSB0aGlzLmlzX2RpcnR5ID0gdHJ1ZTtcbiAgICBcbiAgICBpZih0aGlzLmFkanVzdF9oZWlnaHQpIHRoaXMuYWRqdXN0X2hlaWdodCh0aGlzLmlucHV0KTtcblxuICAgIC8vIEJ1YmJsZSB0aGlzIHNldFZhbHVlIHRvIHBhcmVudHMgaWYgdGhlIHZhbHVlIGNoYW5nZWRcbiAgICB0aGlzLm9uQ2hhbmdlKGNoYW5nZWQpO1xuICB9LFxuICAgICAgYWZ0ZXJJbnB1dFJlYWR5OiBmdW5jdGlvbigpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXMsIG9wdGlvbnM7XG5cbiAgICAgICAgLy8gQ29kZSBlZGl0b3JcbiAgICAgICAgaWYoIXNlbGYub3B0aW9ucy5oaWRkZW4gKXtcblxuICAgICAgICAgIFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgIFN5c3RlbS5pbXBvcnQoXCJtZWRpdW0tZWRpdG9yXCIpLFxuICAgICAgICAgICAgU3lzdGVtLmltcG9ydCgnbWVkaXVtLWVkaXRvci9kaXN0L2Nzcy9tZWRpdW0tZWRpdG9yLm1pbi5jc3MnKSxcbiAgICAgICAgICAgIFN5c3RlbS5pbXBvcnQoJ21lZGl1bS1lZGl0b3IvZGlzdC9jc3MvdGhlbWVzL2ZsYXQubWluLmNzcycpLFxuICAgICAgICAgICAgU3lzdGVtLmltcG9ydCgnLi4vY3NzL214X2plZF9tZWRpdW1fZmxhdC5jc3MnKSxcbiAgICAgICAgICAgIFN5c3RlbS5pbXBvcnQoJy4vbXhfZXh0ZW5kX2plZF9tZWRpdW1fZHJhZ2Ryb3AuanMnKVxuICAgICAgICAgIF0pLnRoZW4oZnVuY3Rpb24obSl7XG4gICAgICAgICAgICB2YXIgTWVkaXVtRWRpdG9yID0gbVswXTsgXG5cbiAgICAgICAgICAgIHNlbGYubWVkaXVtX2NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICBzZWxmLm1lZGl1bV9jb250YWluZXIuaW5uZXJIVE1MID0gc2VsZi5pbnB1dC52YWx1ZTtcblxuICAgICAgICAgICAgc2VsZi5pbnB1dC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzZWxmLm1lZGl1bV9jb250YWluZXIsc2VsZi5pbnB1dCk7XG4gICAgICAgICAgICBzZWxmLmlucHV0LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cbiAgICAgICAgICAgIHNlbGYubWVkaXVtX2VkaXRvciA9IG5ldyBNZWRpdW1FZGl0b3Ioc2VsZi5tZWRpdW1fY29udGFpbmVyLHtcbiAgICAgICAgICAgICAgYnV0dG9uTGFiZWxzOlwiZm9udGF3ZXNvbWVcIixcbiAgICAgICAgICAgICAgdG9vbGJhcjoge1xuICAgICAgICAgICAgICAgIGJ1dHRvbnM6IFsnaDEnLCdoMicsJ2gzJywnYm9sZCcsICdpdGFsaWMnLCAncXVvdGUnLCAnYW5jaG9yJywndW5vcmRlcmVkbGlzdCddXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBzZWxmLm1lZGl1bV9lZGl0b3Iuc2V0Q29udGVudChzZWxmLmdldFZhbHVlKCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZWxmLm1lZGl1bV9lZGl0b3Iuc3Vic2NyaWJlKCdlZGl0YWJsZUlucHV0JywgZnVuY3Rpb24gKGV2ZW50LCBlZGl0YWJsZSkge1xuICAgICAgICAgICAgICBzZWxmLmlucHV0LnZhbHVlID0gZWRpdGFibGUuaW5uZXJIVE1MO1xuICAgICAgICAgICAgICBzZWxmLnJlZnJlc2hWYWx1ZSgpO1xuICAgICAgICAgICAgICBzZWxmLmlzX2RpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgc2VsZi5vbkNoYW5nZSh0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYudGhlbWUuYWZ0ZXJJbnB1dFJlYWR5KHNlbGYuaW5wdXQpO1xuICAgICAgfSxcbiAgICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmKHRoaXMubWVkaXVtX2VkaXRvcikge1xuICAgICAgICB0aGlzLm1lZGl1bV9lZGl0b3IuZGVzdHJveSgpO1xuICAgICAgfVxuICAgIH1cblxuICB9KTtcblxuXG59KSgpO1xuXG5cblxuLy8gV0VCUEFDSyBGT09URVIgLy9cbi8vIC4vc3JjL2pzL214X2V4dGVuZF9qZWRfbWVkaXVtLmpzIl0sInNvdXJjZVJvb3QiOiIifQ==