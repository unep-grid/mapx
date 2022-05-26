import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { promises as fs } from "fs";
import path from "path";
import glob from "glob";

const opt = {
  ignoreAttributes: false,
  processEntities: false
};

const parser = new XMLParser(opt);
const builder = new XMLBuilder(opt);

glob("./orig/*.svg", async (e, files) => {
  try {
    if (e) {
      throw new Error(e);
    }
    for (const f of files) {
      await update(f);
    }
    console.log('done');
  } catch (e) {
    console.error(e);
  }
});

async function update(file) {
  const fileName = path.basename(file);
  const outPath = path.join("./svg", fileName);
  const data = await fs.readFile(file);
  const obj = parser.parse(data);
  if (obj.svg.path) {
    setPathFill(obj.svg.path);
  }
  if (obj.svg.g) {
    if (Array.isArray(obj.svg.g.path)) {
      for (const p of obj.svg.g.path) {
        setPathFill(p);
      }
    } else {
      setPathFill(obj.svg.g.path);
    }
  }
  const out = builder.build(obj);
  await fs.writeFile(outPath, out);
}

function setPathFill(p) {
  if (p) {
    p["@_style"] = "fill:param(fill)";
  }
}
