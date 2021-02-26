import {default as dict } from './dictionary.json';

class Translator {
  constructor(opt) {
    const tl = this;
    tl.opt = Object.assign({}, {langDefault: 'en', lang: 'fr'}, opt);
    tl.setLang();
  }

  setLang(l){
    const tl = this;
    tl.opt._lang = tl._lang = l || tl.opt.langDefault ;
  }

  get(key, vars, lang) {
    const tl = this;
    vars = Object.assign({}, vars); 
    lang = lang || tl._lang;
    const keys = Object.keys(vars);
    const str = dict.reduce(
      (a, d) => (a ? a : d.key === key ? d[lang] || d[tl.opt.langDefault] : null),
      null
    ) || key;
    return (
      keys.reduce((s, v) => {
        return s.replace(new RegExp(`\\$\\{${v}\\}`, 'g'), vars[v]);
      }, str) || str || key
    );
  }
}

export {Translator};
