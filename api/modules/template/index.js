const {readTxt} = require('@mapx/helpers');
const fs = require('fs');
const path = require('path');

const dirs = ['sql', 'html'];

dirs.forEach((dir) => {
  const reg = new RegExp(`\.${dir}$`);
  const files = fs.readdirSync(path.join(__dirname, dir));
  files.forEach(function(file) {
    if (file.match(reg)) {
      const name = path.parse(file).name;
      module.exports[name] = readTxt(path.join(__dirname,dir,file));
    }
  });
});
