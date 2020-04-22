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
  timeout: 5000
};
const defaultsTest = {
  test: () => {
    return false;
  },
  name: 'test',
  ignore: false,
  timeout: 5000
};
const queue = [];

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

  run(opt) {
    const t = this;
    opt = Object.assign({}, opt);
    if (is.isFunction(opt.finally)) {
      t._finally = opt.finally;
    }
    t._next();
  }

  async _next() {
    const t = this;
    const c = queue.shift();
    if (c) {
      await c();
      t._next();
    } else {
      if (t._finally) {
        t._finally();
      }
    }
  }

  check(title, opt) {
    const t = this;
    opt = Object.assign({}, defaultsTests, opt);
    if (opt.ignore) {
      return;
    }

    queue.push(async () => {
      let pass = true;
      const uiSection = t._ui_section(title);
      try {
        const initSuccess = t._promise(opt.init);
        const initTimeout = t._promise_timeout(opt.timeout);
        /**
         * Race between timeout and success
         */
        const data = await Promise.race([initSuccess, initTimeout]);

        if (data === 'timeout') {
          /**
           * Timeout returned before success
           */
          uiSection.icon.innerText = '⏱';
          uiSection.text.innerText = `: timeout ( ${opt.timeout} ms) `;
          return;
        } else {
          /**
           * Launch each tests
           */
          return nextTest(data);
        }
      } catch (e) {
        handleErrorSection(e);
      }

      function handleErrorSection(e) {
        uiSection.text.innerText = `: failed ( ${e} )`;
        uiSection.icon.innerText = '🐞';
      }
      async function nextTest(data) {
        let res = null;
        const test = opt.tests.shift();
        if (!pass || !test) {
          return;
        }
        const it = Object.assign({}, defaultsTest, test);
        const uiResult = t._ui_result(it.name, uiSection);
        if (it.ignore) {
          return;
        }
        const resSuccess = t._promise(it.test, data);
        const resTimeout = t._promise_timeout(it.timeout);
        /**
         * Race between timeout and success
         */ const start = performance.now();
        const resOut = await Promise.race([resSuccess, resTimeout]);
        const success = resOut === true;
        const timing = Math.round((performance.now() - start) * 1e4) / 1e4;
        /**
         * Timeout resolve first
         */ if (resOut === 'timeout') {
          uiResult.icon.innerText = '⏱';
          uiResult.text.innerText = `: timeout ( ${it.timeout} ms) `;
          pass = false;
        } else {
          /**
           * Test resolve first
           */ uiResult.icon.innerText = success ? '✅' : '❌';
          uiResult.text.innerText = success
            ? ''
            : `( ${JSON.stringify(resOut)} )`;
        }
        /**
         * Add timing info
         */ uiResult.timing.innerText = ` (timing :${timing} ms) `;

        if (!pass || !success) {
          handleErrorSection();
        } else {
          nextTest(data);
        }
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
    cb = is.isFunction(cb) ? cb : ()=>{};
    return new Promise(async (resolve, reject) => {
      try {
        const res = await cb(data);
        if (res instanceof Promise) {
          const out = await res;
          resolve(out);
        } else {
          resolve(res);
        }
      } catch (e) {
        reject(e);
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
