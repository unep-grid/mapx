const fs = require('fs');
const path = require('path');
const uConfig = readJSON('./', process.argv[2]);

const uDefault = {
  dict_dir: '/tmp',
  dict_dir_out_built: ['/tmp'],
  dict_dir_out_full: ['/tmp'],
  languages: [],
  language_default: 'en'
};

/**
 * Set config : e.g.../app/config_dict.json
 */
const config = Object.assign({}, uDefault, uConfig);

const files = fs.readdirSync(path.resolve(config.dict_dir));
const dict = [];
files.forEach((file) => {
  if (file.match(/\.json$/)) {
    dict.push(...readJSON(config.dict_dir, file));
  }
});

/**
 * Write full JSON
 */
config.dict_dir_out_full.forEach((dir) => {
  const file = path.resolve(dir, `dict_full.json`);
  fs.writeFileSync(file, JSON.stringify(dict));
});

/**
 * Build one dictionary file per language
 */
config.dict_dir_out_built.forEach((dir) => {
  const pathDest = path.resolve(dir);
  if (!fs.existsSync(pathDest)) {
    throw new Error(`Output directory ${pathDest} does not exist`);
  }
});

config.languages.forEach((language) => {
  let d = dict.map((d) => {
    var o = {
      id: d.id,
      en: d.en
    };
    if (language !== config.languageDefault) {
      o[language] = d[language];
    }
    return o;
  });

  config.dict_dir_out_built.forEach((dir) => {
    let file = path.resolve(dir, `dict_${language}.json`);
    fs.writeFileSync(file, JSON.stringify(d));
  });

  console.log(`Built dict file for ${language}`);
});

function readJSON(dir, file) {
  let buffer = fs.readFileSync(path.resolve(dir || './', file || ''));
  let data = JSON.parse(buffer);
  return data;
}

