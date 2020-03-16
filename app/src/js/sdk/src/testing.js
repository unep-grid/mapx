import {el} from '../node_modules/@fxi/el/src/index.js';
import * as is from '../../is_test/index.js';

const defaults = {
  title: 'test',
  container: document.body
};
const defaultsTests = {
  tests: [],
  name: 'test',
  ignore: false,
  timeout: 1000
};
const defaultsTest = {
  test: () => {
    return false;
  },
  name: 'test',
  ignore: false,
  timeout: 1000
};

/**
 * Testing process
 *
 * @example
 * const t = new Testing({
 *   container :  elResults,
 *   title : 'mapx sdk test'
 * })
 *
 *
 * t.check('get view list',{
 *    init : ()=>{
 *      return mapx.ask('get_views');
 *    },
 *   tests : [{
 *      name : 'is array',
 *      test : (r)=>Array.isArray(r)
 *   }]
 * })
 */

export class Testing {
  constructor(opt) {
    const t = this;
    t.h = is;
    t.opt = Object.assign({}, defaults, opt);
  }

  destroy() {
    const t = this;
    t._destroyed = true;
    t.opt.tests = [];
  }
  check(title, opt) {
    const t = this;
    opt = Object.assign({}, defaultsTests, opt);
    if (opt.ignore) {
      return;
    }
    const uiSection = t._ui_section(title);
    const initSuccess = t._promise(opt.init);
    const initTimeout = t._promise_timeout(opt.timeout);
    /**
     * Race between timeout and success
     */
    return Promise.race([initSuccess, initTimeout]).then((data) => {
      if (data === 'timeout') {
        /**
         * Timeout returned before success
         */
        uiSection.icon.innerText = '⏱';
        uiSection.text.innerText = `: timeout ( ${opt.timeout} ms) `;
      } else {
        /**
         * Launch each tests
         */
        let pass = true;
        opt.tests.forEach((it) => {
          it = Object.assign({}, defaultsTest, it);
          const uiResult = t._ui_result(it.name, uiSection);
          let res = null;
          if (it.ignore) {
            return;
          }
          const resSuccess = t._promise(it.test, data);
          const resTimeout = t._promise_timeout(it.timeout);
          /**
           * Race between timeout and success
           */
          const start = performance.now();
          return Promise.race([resSuccess, resTimeout]).then((res) => {
            const success = res === true;
            const timing = Math.round((performance.now()-start)*1e4)/1e4;
            if (res === 'timeout') {
              uiResult.icon.innerText = '⏱';
              uiResult.text.innerText = `: timeout ( ${it.timeout} ms) `;
              pass = false;
            } else {
              uiResult.icon.innerText = success ? '✅' : '❌';
              uiResult.text.innerText = success
                ? ''
                : `( ${JSON.stringify(res)} )`;
            }
            uiResult.timing.innerText = ` (timing :${timing} ms) `;

            if (!pass || !success) {
              uiSection.text.innerText = ': failed ';
              uiSection.icon = '🐞';
            }
          });
        });
      }
    });
  }
  _promise_timeout(ms) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('timeout');
      }, ms || 1000);
    });
  }
  _promise(cb, data) {
    return new Promise((resolve) => {
      res = cb(data);
      if (res instanceof Promise) {
        res.then((r) => {
          resolve(r);
        });
      } else {
        resolve(res);
      }
    });
  }
  _ui_section(title) {
    const t = this;
    let elIcon, elTitle, elText, elList;
    const elSection = el(
      'div',
      {
        style: {
          padding: '10px'
        }
      },
      el(
        'b',
        (elIcon = el('span')),
        (elTitle = el('span', title)),
        (elText = el('span'))
      ),
      (elList = el('ul'))
    );
    t.opt.container.appendChild(elSection);
    return {
      icon: elIcon,
      title: elTitle,
      text: elText,
      list: elList
    };
  }
  _ui_result(name, section) {
    const t = this;
    let elIcon, elTitle, elText;
    const elLi = el(
      'li',
      (elIcon = el('span')),
      (elTitle = el('span', name)),
      (elText = el('span')),
      (elTiming = el('span', {style: {color: '#ccc'}}))
    );
    section.list.appendChild(elLi);
    return {
      icon: elIcon,
      title: elTitle,
      text: elText,
      timing: elTiming
    };
  }
}
