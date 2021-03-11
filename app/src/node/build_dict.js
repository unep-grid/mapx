const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const exists = util.promisify(fs.exists);
const {TranslationServiceClient} = require('@google-cloud/translate');
const translationClient = new TranslationServiceClient();
const translationCred = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const entities = require('entities');
const {JSDOM} = require('jsdom');
const dom = new JSDOM('');
const elBody = dom.window.document.body;

/**
 * Launch update based on config file
 */
try {
  update(process.argv[2]);
} catch (e) {
  console.error(e);
}
async function update(confFile) {
  const dict = [];

  const uDefault = {
    dict_dir: '/tmp',
    dict_dir_out: ['/tmp'],
    dict_file_cache: '/tmp/cache.json',
    languages: [],
    language_default: 'en'
  };

  const uConfig = await readJSON('./', confFile);
  const config = Object.assign({}, uDefault, uConfig);
  const files = await readdir(path.resolve(config.dict_dir));
  const cacheFile = path.resolve(config.dict_file_cache);

  /**
   * Merge all dict
   */
  for (let file of files) {
    if (file.match(/\.json$/)) {
      dict.push(...(await readJSON(config.dict_dir, file)));
    }
  }

  /**
   * Add missing translation
   */
  const hasKey = !!translationCred;
  const hasFullCache = await exists(cacheFile);
  const cache = hasFullCache ? await readJSON(cacheFile) : [];
  let updateCache = false;

  if (!hasKey) {
    console.warn(`\
      Missing translation API key \
      GOOGLE_MXTRANSLATE_KEY in env vars. \
      Skip auto-translate. \
      `);
  } else {
    /**
     * For each original items, for each languages except default,
     * search for value or cached value;
     */
    for (let language of config.languages) {
      //for (let language of ['bn']) {
      if (language !== config.language_default) {
        const job = {
          from: config.language_default,
          to: language,
          str: [],
          id: []
        };
        for (let item of dict) {
          /**
           * Update if :
           * - no cache
           * - translation of default has changed AND no value in target language
           */
          let itemCache = cache.find((c) => c.id === item.id);
          let hasCache = !!itemCache && !!itemCache[job.to];
          let useCache = hasCache && item[job.from] === itemCache[job.from];
          let hasNoValue = !item[job.to];

          if (hasNoValue) {
            if (useCache) {
              /**
               * Cache is available, go for it
               */
              item[job.to] = itemCache[job.to];
            } else {
              updateCache = true;
              job.str.push(item[job.from]);
              job.id.push(item.id);
            }
          }
        }
        if (job.id.length > 0) {
          console.log(
            `Translate job sent ( ${job.id.length} items) for language ${
              job.to
            }`
          );
          let res = await translate(job);
          for (let translated of res) {
            let item = dict.find((c) => c.id === translated.id);
            item[language] = `${translated[language]}`;
          }
        }
      }
    }
  }

  /**
   * Write cache
   */
  if (updateCache) {
    await writeFile(cacheFile, JSON.stringify(dict, 0, 2));
  }

  /**
   * Test if output dirs exist
   */
  for (let dir of config.dict_dir_out) {
    const pathDest = path.resolve(dir);
    if (!(await exists(pathDest))) {
      throw new Error(`Output directory ${pathDest} does not exist`);
    }
  }

  /**
   * Write full JSON
   */
  for (let dir of config.dict_dir_out) {
    const file = path.resolve(dir, `dict_full.json`);
    await writeFile(file, JSON.stringify(dict, 0, 2));
  }

  /**
   * Build one dictionary file per language
   */
  for (let language of config.languages) {
    const d = dict.map((d) => {
      const o = {
        id: d.id,
        en: d.en
      };
      if (language !== config.language_default) {
        o[language] = d[language];
      }
      return o;
    });

    for (let dir of config.dict_dir_out) {
      let file = path.resolve(dir, `dict_${language}.json`);
      await writeFile(file, JSON.stringify(d, 0, 2));
    }
    console.log(`Built dict file for ${language}`);
  }
}

async function readJSON(dir, file) {
  let buffer = await readFile(path.resolve(dir || './', file || ''));
  let data = JSON.parse(buffer);
  return data;
}

//function isCountry(id) {
//return !!(id || '').match(/^[A-Z]{3}/);
//}

//function wait(d) {
//return new Promise((resolve) => {
//setTimeout(() => {
//resolve(true);
//}, d);
//});
//}

//function containsHtmlTags(str) {
//return /<\/?[a-z][\s\S]*>/i.test(str);
//}

async function translate(opt) {
  const maxItems = 500;
  opt = Object.assign({}, {from: 'en', to: 'fr', str: ['hi'], id: [1]}, opt);

  if (!Array.isArray(opt.str)) {
    opt.str = [opt.str];
  }
  if (!Array.isArray(opt.id)) {
    opt.id = [opt.id];
  }

  // escape
  opt.str = opt.str.map(gTradEscape);

  // chunks
  const chunks = opt.str.reduce((acc, s, i) => {
    if (i % maxItems === 0) {
      acc.push(opt.str.slice(i, i + maxItems));
    }
    return acc;
  }, []);

  const res = [];

  try {
    for (let chunk of chunks) {
      try {
        const request = {
          parent: `projects/mxtranslate/locations/global`,
          contents: chunk,
          mimeType: 'text/html',
          sourceLanguageCode: opt.from,
          targetLanguageCode: opt.to
        };

        const [response] = await translationClient.translateText(request);

        res.push(...response.translations.map((t) => t.translatedText));
      } catch (error) {
        console.error(error.details);
      }
    }

    if (res.length !== opt.id.length) {
      throw new Error('Results length do not match id list length');
    }

    return res.map((r, i) => {
      return {
        id: opt.id[i],
        [opt.to]: gTradUnescape(r)
      };
    });
  } catch (error) {
    console.error(error.details);
  }
}

/**
 * Google translated mess up the template strings.
 * Strategy : replace templating string by void html tags,
 * then, parsing the result and replacing back items.
 */
function gTradEscape(str) {
  try{
  /**
   * href issue : we protect {{ }} inside href.
   */
  elBody.innerHTML = str;
  let elsA = elBody.querySelectorAll('a');
  if (elsA.length > 0) {
    for (let a of elsA) {
      let href = a.getAttribute('href');
      if (href) {
        href = href.split('{{').join('_s_');
        href = href.split('}}').join('_e_');
        a.setAttribute('href', href);
      }
    }
  }
  str = elBody.innerHTML;

  /**
   * Remplace other by void tags
   */
  //str = str.split('"').join('<meta type="escape_dbl_quote">');
  str = str.split('\n').join('<meta type="escape_new_line">');
  str = str.split('\\n').join('<meta type="escape_escaped_new_line">');
  str = str.split('%s').join('<meta type="escape_sprintf">');
  /**
   * brackets by span tags.
   */
  str = str.split('{{').join('<span type="bracket" key="');
  str = str.split('}}').join('"></span>');
  elBody.innerHTML = str;
  /**
   * Re process <a href>... WHAT A MESS GOOGLE.
   */
  elsA = elBody.querySelectorAll('a');
  if (elsA.length > 0) {
    for (let a of elsA) {
      let href = a.getAttribute('href');
      if (href) {
        href = href.split('_s_').join('{{');
        href = href.split('_e_').join('}}');
      }
      a.setAttribute('href', href);
    }
  }

  str = elBody.innerHTML;

  }catch(e){
   console.error(e);
  }
  return str;
}

function gTradUnescape(str) {
  // replaceAll not available in node
  elBody.innerHTML = str;
  const elsBracks = elBody.querySelectorAll('[type="bracket"]');
  //const elsDblQuote = elBody.querySelectorAll('[type="escape_dbl_quote"]');
  const elsNewLine = elBody.querySelectorAll('[type="escape_new_line"]');
  const elsEscNewLine = elBody.querySelectorAll(
    '[type="escape_escaped_new_line"]'
  );
  const elsEscSprintf = elBody.querySelectorAll('[type="escape_sprintf"]');

  try {
    for (let el of elsBracks) {
      el.outerHTML = ` {{${el.getAttribute('key')}}}`;
    }

    //for (let el of elsDblQuote) {
    //el.outerHTML = '"';
    //}

    for (let el of elsNewLine) {
      el.outerHTML = '\n';
    }
    for (let el of elsEscNewLine) {
      el.outerHTML = '\\n';
    }

    for (let el of elsEscSprintf) {
      el.outerHTML = '%s';
    }

    str = entities.decodeHTML(elBody.innerHTML);
  } catch (e) {
    console.error(e);
  }
  return str;
}
