import {el} from '@fxi/el';

class MessageFlash {
  constructor(parent) {
    this.addTo(parent.el);
    this.timeout = 0;
  }

  addTo(elContainer) {
    var mf = this;
    
    mf.elMessageContainer = el(
      'div',
      {class: ['mc-flash']},
      (mf.elMessage = el('div'))
    );
    elContainer.appendChild(mf.elMessageContainer);
  }

  destroy() {
    var mf = this;
    clearTimeout(mf._msgTimeout);
    mf.elMesssageContainer.remove();
  }

  flash(str, duration) {
    var mf = this;
    duration = duration || 2000;
    str = str || '';
    mf.cancel();
    mf.activate();
    mf.setMessage(str);
    mf.timeout = setTimeout(function() {
      mf.disable();
    }, duration);
  }

  setMessage(str){
    var mf = this; 
    mf.elMessage.innerText = str;
  }

  cancel(){
    var mf = this;
    clearTimeout(mf.timeout);
    mf.disable();
  }

  activate(){
    var mf = this;
    mf.elMessageContainer.classList.add('active');
  }
  disable(){
    var mf = this;
    mf.elMessageContainer.classList.remove('active');
  }

}

export {MessageFlash};
