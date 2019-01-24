export function updateSelectizeItems(o) {
  var items = o.items;
  var id = o.id;
  var l = mx.listener;
  var k = Object.keys(l);
  k.forEach(m => {
    var ml = l[m];
    if (!ml) return;
    var s = ml[id];
    if (!s) return;
    if (!items) return;
    var ss = s[0].selectize;
    ss.clearOptions();
    ss.addOption(items);
    ss.refreshOptions();
  });
}




export function initSelectizeAll(opt) {
  opt = opt || {};
  mx.helpers.moduleLoad("selectize")
    .then(Selectize => {
      var selector = mx.helpers.isElement(opt.selector) ? opt.selector : document.querySelector(opt.selector);
      var out = [];
      opt.id = opt.id || 'global';
      if (!mx.helpers.isEmpty(mx.selectize[opt.id])){
        removeSelectizeGroupById(opt.id); 
      }
      mx.selectize[opt.id] = out;
      var selects = $(selector).find('select');
      var $select;
      selects.each(function(i, s) {
        if(s.id){
          var script = selector.querySelector('script[data-for=' + s.id + ']');
          var data = script ? script.innerHTML : null;
          var options = opt.options || {};
          if (data) {
            options = JSON.parse(data);
            if (options.renderFun) {
              options.render = {
                option: mx.helpers[options.renderFun],
              };
            }
          }
          options.inputClass = 'form-control selectize-input';
          $select = $(s).selectize(options);
        }else{
          $select = $(s).selectize();
        }
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
    selectize.forEach(s => {
      if (mx.helpers.isFunction(s.destroy)) s.destroy();
      if (mx.helpers.isFunction(s.remove)) s.remove();
    });
  }
  delete mx.selectize[id];
}
