import '../css/mx_content_tools.css';
import '../css/mx_view_toggle.css';
import '../css/mx_shiny.css';
import './shiny.js';
import './mx_binding_helper.js';
import './mx_binding_pwd.js';

console.log('INIT SHINY');

$(document).on('shiny:disconnected', () => {
  mx.helpers.modal({
    title: 'Disconnected',
    content: 'This session has been disconnected, probably because of a network issue, please reload',
    onClose: mx.helpers.reload,
    textCloseButton: 'Reload',
    addBackground: true
  });
});
