/* jshint evil:true, esversion:6  */

export function displayDiafModal(view) {
  var h = mx.helpers;
  var meta = h.path(view, '_meta', null);
  var el = h.el;

  if (meta) {
    var elContent = h.metaSourceToDiafUi(meta);

    var elTitleModal = el('span', {
      dataset: {
        lang_key: 'data_integrity_title'
      }
    });

    var elModal = h.modal({
      id: 'diaf_modal',
      content: elContent,
      title: elTitleModal
    });

    h.updateLanguageElements({
      el: elModal
    });

  }
}

