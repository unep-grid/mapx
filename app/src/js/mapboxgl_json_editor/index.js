/**
 * Simple mapbox JSON style editor
 */

window.elDevStyleEditor = null;

export async function showDevStyleEditor() {
  const h = mx.helpers;
  if (window.elDevStyleEditor) {
    return;
  }
  const map = h.getMap();
  const style = JSON.stringify(map.getStyle());
  window.elDevStyleEditor = h.el(
    'div',
    {
      style: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        height: '60%'
      }
    },
    style
  );
  const elBtnUpdate = h.el(
    'button',
    {
      class: ['btn', 'btn-default'],
      on: {click: update}
    },
    'update'
  );
  await h.moduleLoad('ace');
  const b = await h.moduleLoad('js-beautify');

  await h.modal({
    title: 'Dev mapbox gl style editor',
    content: window.elDevStyleEditor,
    onClose: clean,
    buttons: [elBtnUpdate]
  });
  const editor = ace.edit(window.elDevStyleEditor);
  editor.session.setMode('ace/mode/json');
  editor.setOptions({
    maxLines: 200
  });
  const s = editor.getSession();
  const v = s.getValue();
  const t = await b.js(v);
  s.setValue(t);

  window._editor_style = editor;

  function update() {
    const newStyle = s.getValue();
    map.setStyle(JSON.parse(newStyle),{diff:false});
  }
  function clean(){
    map.setStyle(JSON.parse(style),{diff:false});
    editor.destroy();
    delete window.elDevStyleEditor;
  }
}
