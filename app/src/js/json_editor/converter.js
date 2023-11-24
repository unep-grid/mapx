const fs = require('fs');
const process = require('process');

const convertFileToClassSyntax = (sourceFilePath, destFilePath) => {
  fs.readFile(sourceFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading file: ${sourceFilePath}`, err);
      return;
    }

    let converted = data
      .replace(/JSONEditor\.defaults\.editors\.(\w+)\s*=\s*JSONEditor\.defaults\.editors\.(\w+)\.extend\({/g, 'JSONEditor.defaults.editors.$1 = class $1 extends JSONEditor.defaults.editors.$2 {')
      .replace(/this\._super\(/g, 'super(')
      // Handle cases where init function is present
      .replace(/init: function\((.*?)\)\s*{/g, (match, p1) => {
        return p1 ? `constructor(${p1}) {\n    super();` : `constructor() {\n    super();`;
      })
      // Add missing closing bracket for class definition
      .replace(/}\);$/gm, '};');

    fs.writeFile(destFilePath, converted, 'utf8', (err) => {
      if (err) {
        console.error(`Error writing file: ${destFilePath}`, err);
        return;
      }
      console.log(`File converted: ${destFilePath}`);
    });
  });
};

const main = () => {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: node extend_to_class.js <source_file>.js <dest_file>.js');
    return;
  }

  const [sourceFilePath, destFilePath] = args;
  convertFileToClassSyntax(sourceFilePath, destFilePath);
};

main();
