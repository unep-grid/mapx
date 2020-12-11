const fs = require('fs');
const path = require('path');
const uConfig = readJSON('./', process.argv[2]);

/**
 * Set config : e.g.../app/config_dict.json
 */
const config = Object.assign(
  {},
  {
    dict_dir: '/tmp',
    dict_dir_built: ['/tmp'],
    dict_files: ['dict_main.json', 'dict_languages.json'],
    languages: ['en', 'fr', 'es', 'ru', 'zh', 'de', 'bn', 'fa', 'ps'],
    language_default: 'en'
  },
  uConfig
);

const dict = [];
config.dict_files.forEach((file) => {
  dict.push(...readJSON(config.dict_dir, file));
});

/**
 * Build one dictionary file per language
 */
config.dict_dir_built.forEach((dir) => {
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

  config.dict_dir_built.forEach((dir) => {
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
