import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Check if a file exists in the build directory
 * @param {string} filePath - Path relative to www directory
 * @returns {boolean}
 */
export function fileExists(filePath) {
  const fullPath = join(process.cwd(), 'www', filePath);
  return existsSync(fullPath);
}

/**
 * Check if a directory exists in the build directory
 * @param {string} dirPath - Path relative to www directory
 * @returns {boolean}
 */
export function directoryExists(dirPath) {
  const fullPath = join(process.cwd(), 'www', dirPath);
  return existsSync(fullPath);
}

/**
 * Get list of files in a directory that match a pattern
 * @param {string} dirPath - Path relative to www directory
 * @param {RegExp} pattern - Pattern to match filenames against
 * @returns {string[]} List of matching filenames
 */
export function getFilesMatching(dirPath, pattern) {
  const fullPath = join(process.cwd(), 'www', dirPath);
  if (!existsSync(fullPath)) return [];
  return readdirSync(fullPath).filter(file => pattern.test(file));
}

/**
 * Check if a file contains specific content
 * @param {string} filePath - Path relative to www directory
 * @param {string|RegExp} content - Content to check for
 * @returns {boolean}
 */
export function fileContains(filePath, content) {
  const fullPath = join(process.cwd(), 'www', filePath);
  if (!existsSync(fullPath)) return false;
  const fileContent = readFileSync(fullPath, 'utf-8');
  if (content instanceof RegExp) {
    return content.test(fileContent);
  }
  return fileContent.includes(content);
}

/**
 * Check if a file is non-empty
 * @param {string} filePath - Path relative to www directory
 * @returns {boolean}
 */
export function fileHasContent(filePath) {
  const fullPath = join(process.cwd(), 'www', filePath);
  if (!existsSync(fullPath)) return false;
  const stats = existsSync(fullPath);
  return stats.size > 0;
}

/**
 * Get all files in a directory recursively
 * @param {string} dirPath - Path relative to www directory
 * @returns {string[]} List of file paths
 */
export function getAllFiles(dirPath) {
  const fullPath = join(process.cwd(), 'www', dirPath);
  if (!existsSync(fullPath)) return [];
  
  const files = [];
  const entries = readdirSync(fullPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullEntryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullEntryPath));
    } else {
      files.push(fullEntryPath);
    }
  }
  
  return files;
}
