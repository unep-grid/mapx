## Mapbox Font Sync
The Mapbox Font Sync is a utility to help you synchronize your local TrueType font files (.ttf) with your Mapbox account. It scans your local font folder, uploads any missing fonts to your Mapbox account, and deletes any fonts from your account that are not present in your local folder. The utility provides a class called FontSync, which you can import and use in your Node.js project.

## Example Usage

```js
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

```
In this example, replace <username> with your Mapbox username. Make sure to set the `MAPBOX_MAPX_FONTS
