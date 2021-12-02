import {el} from './../el/src';
import './style.css';
const def = {
  elContent: document.getElementsByTagName('body'),
  elInput: el('input', {
    type: 'search',
    class: ['form-control', 'txt-filter--input'],
    placeholder: 'Search'
  }),
  elContainer: null,
  selector: 'div > ul > li'
};

export class TextFilter {
  constructor(opt) {
    const sr = this;
    sr.opt = Object.assign({}, def, opt);
    if (!this.opt.elContainer instanceof Element) {
      throw new Error('Container required');
    }
    sr.search = sr.search.bind(sr);
    sr.init();
  }
  init() {
    const sr = this;
    sr.build();
    sr._elsTarget = sr._elContent.querySelectorAll(sr.opt.selector);
    sr._elInput.addEventListener('keyup', sr.search);
  }
  build() {
    const sr = this;
    sr._elInput = sr.opt.elInput;
    sr._elHeader = el('div', {class: 'txt-filter--header'}, sr._elInput);
    sr._elContainer = sr.opt.elContainer;
    sr._elContent = el('div', {class: 'txt-filter--content'}, sr.opt.elContent);
    sr._elContainer.appendChild(sr._elHeader);
    sr._elContainer.appendChild(sr._elContent);
    sr._elContainer.classList.add('txt-filter--wrapper');
  }
  search() {
    const sr = this;
    const txt = sr._elInput.value;
    if (!txt || txt.length < 3) {
      return sr.reset();
    }
    let found = true;
    clearTimeout(sr._search_to_id);
    sr._search_to_id = setTimeout(() => {
      const re = new RegExp(`${txt}`, 'gi');
      sr.reset();
      for (const el of sr._elsTarget) {
        if (!el.dataset.txt) {
          el.dataset.txt = el.textContent || el.innerText;
        }
        const ok = el.dataset.txt.match(re);
        if (!ok) {
          el.style.display = 'none';
        } else {
          if (!found) {
            found = true;
          }
          el.style.display = 'block';
          for (const elInner of el.querySelectorAll('*')) {
            for (const node of elInner.childNodes) {
              if (node.nodeType == Node.TEXT_NODE) {
                const okNode = node.textContent.match(re);
                if (okNode) {
                  elInner.classList.add('txt-filter--box');
                }
              }
            }
          }
        }
      }
      if (!found) {
        sr.reset();
      }
      sr._elContainer.scrollIntoView();
    }, 300);
  }
  reset() {
    const sr = this;
    for (const elTarget of sr._elsTarget) {
      elTarget.style.display = 'block';
    }
    const elsHl = sr._elContent.querySelectorAll('.txt-filter--box');
    for (const elHl of elsHl) {
      elHl.classList.remove('txt-filter--box');
    }
  }
  destroy() {
    const sr = this;
    sr._elInput.removeEventListener('keyup', sr.search);
    sr._elContainer.innerHTML = '';
    sr._elContainer.classList.remove('txt-filter--wrapper');
  }
}
