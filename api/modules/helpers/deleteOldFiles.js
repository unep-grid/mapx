import { settings } from "#root/settings";
import fs from "fs/promises";
import path from "path";

/**
 * Deletes files and folders in a directory that are older than the specified age and match a given prefix.
 * @param {string} directoryPath - The path to the directory.
 * @param {string} prefixPattern - The prefix pattern to match.
 * @param {number} maxAgeInHours - The maximum age of files and folders to keep.
 */
export async function deleteOldFiles(
  directoryPath,
  prefixPattern = "",
  maxAgeInHours = 48
) {
  try {
    const filesAndFolders = await fs.readdir(directoryPath);
    const regex = new RegExp(`^${prefixPattern}`);

    for (const item of filesAndFolders) {
      if (!regex.test(item)) {
        continue;
      }

      const itemPath = path.join(directoryPath, item);
      const stats = await fs.stat(itemPath);

      const currentTime = Date.now();
      const itemAgeInMilliseconds = currentTime - stats.mtime.getTime();
      const maxAgeInMilliseconds = maxAgeInHours * 60 * 60 * 1000;

      if (itemAgeInMilliseconds > maxAgeInMilliseconds) {
        if (stats.isDirectory()) {
          await fs.rm(itemPath, { recursive: true, force: true });
        } else {
          await fs.unlink(itemPath);
        }
        console.log(`Deleted ${itemPath}`);
      }
    }
  } catch (error) {
    console.error(`Error deleting old files and folders: ${error.message}`);
  }
}

export async function clearDownload() {
  const done = await deleteOldFiles(
    settings.vector.path.download,
    settings.ttl.downloads.prefix,
    settings.ttl.downloads.hours
  );
  return done;
}
