export function updateSelectizeItems(o) {
  var items = o.items;
  var id = o.id;
  var l = mx.listener;
  var k = Object.keys(l);
  k.forEach((m) => {
    var ml = l[m];
    if (!ml) {
      return;
    }
    var s = ml[id];
    if (!s) {
      return;
    }
    if (!items) {
      return;
    }
    var ss = s[0].selectize;
    ss.clearOptions();
    ss.addOption(items);
    ss.refreshOptions();
  });
}

export function initSelectizeAll(opt) {
  opt = opt || {};
  const h = mx.helpers;
  h.moduleLoad('selectize').then(() => {
    var selector = h.isElement(opt.selector)
      ? opt.selector
      : document.querySelector(opt.selector);
    var out = [];
    opt.id = opt.id || 'global';
    if (!h.isEmpty(mx.selectize[opt.id])) {
      removeSelectizeGroupById(opt.id);
    }
    mx.selectize[opt.id] = out;
    var selects = $(selector).find('select');
    var $select;
    selects.each(function(i, s) {
      var localOptions = {};
      var options = {
        dropdownParent : 'body'
      };
      var script;
      var data;
      if (s.id) {
        script = selector.querySelector('script[data-for=' + s.id + ']');
        data = script ? script.innerHTML : null;
        if (data) {
          localOptions = JSON.parse(data);
          if (localOptions.renderFun) {
            localOptions.render = {
              option: h[localOptions.renderFun]
            };
          }
        }
      }
      options.inputClass = 'form-control selectize-input';
      options = Object.assign(options, opt.options, localOptions);
      $select = $(s).selectize(options);
      var selectize = $select[0].selectize;
      out.push(selectize);
    });
    return out;
  });
}

export function removeSelectizeGroupById(id) {
  id = id || 'global';
  var selectize = mx.selectize[id];
  if (mx.helpers.isArray(selectize)) {
    selectize.forEach((s) => {
      if (mx.helpers.isFunction(s.destroy)) {
        s.destroy();
      }
      if (mx.helpers.isFunction(s.remove)) {
        s.remove();
      }
    });
  }
  delete mx.selectize[id];
}

export function closeSelectizeGroupById(id) {
  id = id || 'global';
  var selectize = mx.selectize[id];
  if (mx.helpers.isArray(selectize)) {
    selectize.forEach((s) => {
      if (mx.helpers.isFunction(s.close)) {
        s.close();
      }
    });
  }
}
