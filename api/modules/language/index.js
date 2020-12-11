const {readTxt, parseTemplate} = require('@mapx/helpers');
const fs = require('fs');
const path = require('path');

const dir = 'dict_built';
const db = {};
const files = fs.readdirSync(path.join(__dirname, dir));

/**
 * Populate language db
 */
files.forEach((file) => {
  const name = path.parse(file).name;
  const lang = name.split(/_|\./)[1];
  const data = JSON.parse(readTxt(path.join(__dirname, dir, file)));
  db[lang] = {};
  data.forEach((d) => {
    db[lang][d.id] = d[lang] || d.en || d.id;
  });
});

module.exports.t = (lang, id, data) => {
  let item;
  try {
    item = db[lang || 'en'][id];
    if (data) {
      item = parseTemplate(item, data);
    }
  } catch (e) {}
  return item || id;
};
