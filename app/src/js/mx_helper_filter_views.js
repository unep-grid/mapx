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
export function filterViewsListText(o) {
  var h = mx.helpers;
  var selectorInput = o.selectorInput;
  var idMap = o.idMap;
  var onFiltered = o.onFiltered;
  var classHide = o.classHide;
  var classSkip = o.classSkip;
  var elInput =
    selectorInput instanceof Node
      ? selectorInput
      : document.querySelector(selectorInput);

  var listener = function() {
    var views = mx.maps[idMap].views;
    if (!views || this.value === undefined) {
      return;
    }

    var lang = mx.settings.language;
    var search = this.value.toLowerCase();
    var displayAll = h.isEmpty(search);
    var txt = "";
    views.forEach((v) => {
      var found = true;
      var el = document.getElementById(v.id);
      if (h.isElement(el)) {
        var hasSkip = el.classList.contains(classSkip);
        if (!hasSkip) {
          if (displayAll) {
            el.classList.remove(classHide);
          } else {
            txt =
              h.getLabelFromObjectPath({
                obj: v,
                path: 'data.title',
                lang: lang,
                defaultKey: ''
              }) +
              h
                .getLabelFromObjectPath({
                  obj: v,
                  path: 'data.abstract',
                  lang: lang,
                  defaultKey: ''
                }).toLowerCase();

             txt = txt.toLowerCase();

            if (h.isString(txt)) {
              found = txt.indexOf(search) > -1;
              //console.log({found,txt,search});
            } else {
              console.log(txt);
              found = false;
            }

            if (found) {
              el.classList.remove(classHide);
            } else {
              el.classList.add(classHide);
            }
          }
        }
      }
    });
    if (onFiltered && onFiltered instanceof Function) {
      onFiltered();
    }
  };

  elInput.addEventListener('keyup', listener);
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
export function filterViewsListCheckbox(o) {
  var h = mx.helpers;
  var selectorInput = o.selectorInput;
  var idMap = o.idMap;
  var elInput =
    selectorInput instanceof Node
      ? selectorInput
      : document.querySelector(selectorInput);
  var classHide = o.classHide;

  elInput.addEventListener('click', listener);

  function listener(e) {
    if (!e || !e.target.dataset.filter) {
      return;
    }
    e.stopImmediatePropagation();

    var elFilter;
    var views = mx.maps[idMap].views;
    if (!views) {
      return;
    }
    var elFilters = elInput.querySelectorAll('.filter');
    var filters = [];

    for (var f = 0, fL = elFilters.length; f < fL; f++) {
      elFilter = elFilters[f];
      if (elFilter.checked) {
        filters.push({
          filter: elFilter.dataset.filter,
          type: elFilter.dataset.type
        });
      }
    }

    /**
     * Group filters
     */
    var filtersTypes = filters.map((f) => f.type);
    var toShow = [];
    var filter = '';
    var idView;
    var elView;
    var found;
    var exclude;
    /**
     * Process each views.
     */
    views.forEach((view) => {
      idView = view.id;
      elView = document.getElementById(idView);
      if (!h.isElement(elView)) {
        /**
        * If this is an imported view – e.g. from a
        * story map There is maybe no DOM element.
        */
        return;
      }
      /**
       * For each type
       */
      exclude = false;
      filtersTypes.forEach((type) => {
        /*
         * For each filter
         */
        if (exclude) {
          return;
        }

        found = false;
        filters
          .filter((f) => f.type === type)
          .forEach((filterData) => {
            if (found) {
              return;
            }
            filter = filterData.filter;
            found = isFound(view, type, filter);
          });

        if (!found) {
          exclude = true;
        }
      });

      if (exclude) {
        elView.classList.add(classHide);
      } else {
        toShow.push(view);
        elView.classList.remove(classHide);
      }
    });

    updateCount(toShow);
  }

  function updateCount(views) {
    var elsCount = document.querySelectorAll('.mx-check-toggle-filter-count');
    var tagsCount = h.getTagsGroupsFromView(views);
    var count = 0;
    var byType;
    var byId;
    elsCount.forEach((el) => {
      count = 0;
      byType = tagsCount[el.dataset.type];
      if (byType) {
        byId = byType[el.dataset.id];
        if (byId) {
          count = byId;
        }
      }
      el.innerText = '( ' + count + ' )';
    });
  }

  function isFound(view, type, filter) {
    var found = false;
    switch (type) {
      case 'view_classes':
        if (view.data && view.data.classes) {
          found = view.data.classes.indexOf(filter) > -1;
        }
        break;
      case 'view_collections':
        if (view.data && view.data.collections) {
          found = view.data.collections.indexOf(filter) > -1;
        }
        break;
      case 'view_components':
        if (view._components) {
          found = view._components.indexOf(filter) > -1;
        }
        break;
      default:
        found = false;
    }
    return found;
  }

  return listener;
}
