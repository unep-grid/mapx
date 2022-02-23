import {readTxt} from '#mapx/helpers';
import fs from 'fs';
import path from 'path';

import {fileURLToPath} from 'url';
import {dirname} from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dirs = ['sql', 'html'];
const templates = {};

for (const dir of dirs) {
  const reg = new RegExp(`\\.${dir}$`);
  const files = fs.readdirSync(new URL(dir, import.meta.url).pathname);
  for (const file of files) {
    if (file.match(reg)) {
      const {
        name
      } = path.parse(file);
      templates[name] = readTxt(path.join(__dirname,dir,file));
    }
  }
}

export {templates};
