import {ButtonPanel} from './../button_panel';
import {el} from './../el/src/index.js';
import './less/mx_panel.less';

/**
 * This is a partial implementation of the main MapX panel
 * the idea is to be able to control every aspect of the panel via
 * this module
 * For now, it's just a wrapper around ButtonPanel.
 */

const settings = {
  panel: {
    elContainer: document.body,
    position: 'top-left',
    title_text: 'Hello',
    button_text: 'click me',
    button_classes: ['fa', 'fa-list-ul'],
    container_style: {
      width: '480px',
      maxHeight: '90%',
      maxWidth: '90%',
      minWidth: '200px',
      minHeight: '80%'
    }
  }
};

class MainPanel {
  constructor(opt) {
    this.opt = Object.assign({}, opt);
    Object.keys(settings).forEach((k) => {
      this.opt[k] = Object.assign({}, settings[k], opt[k]);
    });
    this.init();
  }

  init() {
    const hasShiny = !!window.Shiny;
    const htmlImport = [
      require('./html/headers.html'),
      require('./html/tabs.html'),
      require('./html/tools.html'),
      require('./html/views.html'),
      require('./html/search.html')
    ].join('');

    this.elContent = el(
      'div',
      {
        class: ['mx-panel', 'shadow']
      },
      htmlImport
    );
    this.panel = new ButtonPanel(this.opt.panel);
    this.panel.elPanelContent.appendChild(this.elContent);
  
    if(hasShiny){
      Shiny.bindAll(this.elContent);
    }
    /**
   * TODO : implement all dynamic changes E.g. translation, role changes, etc, filters, etc.
   * here instead of having disconnected function all over the place, mainly in mx_helpers_map
   */
     //this.elProjectLabel = document.getElementById('btnShowProjectLabel');*/
    //this.elProjectLock = document.getElemebtById('btnShowProjectPrivate');
    //this.elLoginLabel = document.getElementById('btnShowLoginLabel');
    //this.elLanguageLabel = document.getElementById('btnShowLanguageLabel');
    // this.elViewsList = document.getElementById('viewsList');*/
  }
}
export {MainPanel};

