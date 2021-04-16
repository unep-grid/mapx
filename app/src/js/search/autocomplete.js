import Tribute from 'tributejs';
import 'tributejs/tribute.css';

import {def} from './default.js';

class AutoComplete {
  constructor(opt) {
    const ac = this;
    ac._elInput = opt.elInput;
    ac._index = opt.index;
    ac._elInput.setAttribute('autocompleteMode', true);
    ac._tribute = new Tribute({
      collection: [ac.getCollectionRemote()]
    });
    ac._tribute.attach(ac._elInput);
  }
  destroy() {
    const ac = this;
    ac._elInput.setAttribute('autocompleteMode', null);
    ac._tribute.destroy();
  }
  updates(results) {
    console.log(results);
  }

  getCollectionRemote() {
    const ac = this;
    const conf = {
      // symbol or string that starts the lookup
      //trigger: null,
      menuContainer: ac._elInput.parentElement,
      // function called on select that returns the content to insert
      selectTemplate: function(item) {
        debugger;
        if (typeof item === 'undefined') return null;
        if (this.range.isContentEditable(this.current.element)) {
          return (
            '<span contenteditable="false"><a>' +
            item.original.key +
            '</a></span>'
          );
        }

        return item.original.value;
      },

      // template for displaying item in menu
      menuItemTemplate: function(item) {
        return item.string;
      },

      // template for when no match is found (optional),
      // If no template is provided, menu is hidden.
      noMatchTemplate: null,

      // column to search against in the object (accepts function or string)
      lookup: 'key',

      // column that contains the content to insert by default
      fillAttr: 'value',

      // REQUIRED: array of objects to match or a function that returns data (see 'Loading remote data' for an example)
      values: (text, cb) => {
        const val = [];
        ac._index.search(text).then((r) => {
          r.hits.forEach(h=>{
             
             h.source_keywords.forEach(k=>{
             val.push({key:k,value:k});  
             })
             h.source_keywords.forEach(k=>{
             val.push({key:k,value:k});  
             })

          })
          cb(r.hits);
        });
      },

      // When your values function is async, an optional loading template to show
      loadingItemTemplate: null,

      // specify whether a space is required before the trigger string
      requireLeadingSpace: true,

      // specify whether a space is allowed in the middle of mentions
      allowSpaces: false,

      // optionally specify a custom suffix for the replace text
      // (defaults to empty space if undefined)
      replaceTextSuffix: '\n',

      // specify whether the menu should be positioned.  Set to false and use in conjuction with menuContainer to create an inline menu
      // (defaults to true)
      positionMenu: true,

      // when the spacebar is hit, select the current match
      spaceSelectsMatch: false,

      // turn tribute into an autocomplete
      autocompleteMode: true,
      menuShowMinLength: 4
    };
    console.log(conf);
    return conf;
  }
}

export {AutoComplete};
