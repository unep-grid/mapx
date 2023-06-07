import path from "path";
import { FontSync } from "./sync/index.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const accessToken = process.env.MAPBOX_MAPX_FONTS;
const folderFont = path.join(__dirname, "files");
const folderCss = path.join(__dirname, "css");
const username = "helsinki";

(async () => {
  try {
    const fontSync = new FontSync({
      token: accessToken,
      folderFont: folderFont,
      folderCss: folderCss,
      user: username,
    });
    await fontSync.syncFonts();
    await fontSync.syncCss();
    console.log("Fonts synchronization completed successfully.");
  } catch (error) {
    console.error("Error during fonts synchronization:", error.message);
  }
})();
