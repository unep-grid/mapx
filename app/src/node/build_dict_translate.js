const fs = require('fs');
const path = require('path');
const util = require('util');
const translate = require('translate');
const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const exists = util.promisify(fs.exists);
const translateKey = process.env.GOOGLE_MXTRANSLATE_KEY;
translate.engine = 'google';

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
    dict_dir_out_built: ['/tmp'],
    dict_dir_out_cache: '/tmp',
    dict_dir_out_full: ['/tmp'],
    languages: [],
    language_default: 'en'
  };

  const uConfig = await readJSON('./', confFile);
  const config = Object.assign({}, uDefault, uConfig);
  const files = await readdir(path.resolve(config.dict_dir));
  const cacheFile = path.resolve(config.dict_dir_out_cache, 'dict_cache.json');

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
  const hasKey = !!translateKey;
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
    for (let item of dict) {
      for (let language of config.languages) {
        if (language !== config.language_default) {
          /**
           * Update if :
           * - no cache
           * - translation of default has changed AND no value in target language
           */
          let itemCache = cache.find((c) => c.id === item.id);
          let hasCache = !!itemCache && !!itemCache[language];
          let useCache =
            hasCache &&
            item[config.language_default] ===
              itemCache[config.language_default];
          let hasNoValue = !item[language];
          let hasHtmlTags = containsHtmlTags(item[config.language_default]);

          if (hasNoValue) {
    //        if (hasHtmlTags) {
              /**
               * HTML tags are poorly translated for some languages, skip them. Impacted:
               * - Emails,
               * - Some UI msg generated server side
               */
              //item[language] = itemCache[config.language_default];
            //} else 
            if (!hasHtmlTags && useCache) {
              /**
               * Cache is available, go for it
               */

              item[language] = itemCache[language];
            } else {
              /**
               * Translate item by item.
               * NOTE:
               *  - Transte + keep formating is
               *
               */
              console.log(
                `Translating  ${item[config.language_default]} in ${language} `
              );

              await wait(10);
              let str = item[config.language_default];
              if(hasHtmlTags){
                str = `<div lang="${config.language_default}">${str}</div>`
              }
              try {
                let translateRemote = await translate(
                  str,
                  {
                    from: config.language_default,
                    to: language,
                    key: translateKey
                  }
                );

                if(hasHtmlTags && language === "bn"){
                  debugger;
                }
                if (translateRemote) {
                  item[language] = `${translateRemote} *`;
                  updateCache = true;
                }
              } catch (e) {
                console.warn(
                  `Translate failed for ${
                    item[config.language_default]
                  } in ${language}`
                );
              }
            }
          }
        }
      }
    }
  }

  /**
   * Write cache
   */
  if (updateCache) {
    await writeFile(cacheFile, JSON.stringify(dict));
  }

  /**
   * Write full JSON
   */
  for (let dir of config.dict_dir_out_full) {
    const file = path.resolve(dir, `dict_full.json`);
    await writeFile(file, JSON.stringify(dict));
  }

  /**
   * Test if output dirs exist
   */
  for (let dir of config.dict_dir_out_built) {
    const pathDest = path.resolve(dir);
    if (!(await exists(pathDest))) {
      throw new Error(`Output directory ${pathDest} does not exist`);
    }
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

    for (let dir of config.dict_dir_out_built) {
      let file = path.resolve(dir, `dict_${language}.json`);
      await writeFile(file, JSON.stringify(d));
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

function wait(d) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, d);
  });
}

function containsHtmlTags(str) {
  return /<\/?[a-z][\s\S]*>/i.test(str);
}
