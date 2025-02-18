import { describe, it, expect } from 'vitest';
import {
  fileExists,
  directoryExists,
  getFilesMatching,
  fileContains,
  fileHasContent,
  getAllFiles,
} from './helpers/file-checks';

describe('Build verification', () => {
  describe('Directory structure', () => {
    it('should have required directories', () => {
      expect(directoryExists('.')).toBe(true);
      expect(directoryExists('sprites')).toBe(true);
      expect(directoryExists('sprites/svg')).toBe(true);
      expect(directoryExists('sdk')).toBe(true);
    });
  });

  describe('Critical files', () => {
    it('should have HTML files', () => {
      expect(fileExists('index.html')).toBe(true);
      expect(fileExists('static.html')).toBe(true);
    });

    it('should have service worker files', () => {
      expect(fileExists('service-worker.js')).toBe(true);
      expect(fileExists('sw_listen_skip_waiting_install.js')).toBe(true);
    });

    it('should have manifest file', () => {
      expect(fileExists('manifest.json')).toBe(true);
      expect(fileContains('manifest.json', '"name": "MapX"')).toBe(true);
    });

    it('should have favicons', () => {
      const favicons = getFilesMatching('.', /\.(ico|png)$/);
      expect(favicons.length).toBeGreaterThan(0);
    });
  });

  describe('Bundle files', () => {
    it('should have main bundle files', () => {
      const bundles = getFilesMatching('.', /\.bundle\.js$/);
      expect(bundles.length).toBeGreaterThan(0);
      expect(bundles.some(f => f.includes('runtime'))).toBe(true);
    });

    it('should have chunk files', () => {
      const chunks = getFilesMatching('.', /\.chunk\.js$/);
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should have Monaco editor workers', () => {
      const workers = getFilesMatching('.', /\.worker\.js$/);
      expect(workers.length).toBeGreaterThan(0);
      expect(workers.some(f => f.includes('editor'))).toBe(true);
    });
  });

  describe('Asset files', () => {
    it('should have sprite files', () => {
      const sprites = getAllFiles('sprites');
      expect(sprites.length).toBeGreaterThan(0);
    });

    it('should have SVG sprite files', () => {
      const svgSprites = getAllFiles('sprites/svg');
      expect(svgSprites.length).toBeGreaterThan(0);
    });

    it('should have SDK files', () => {
      const sdkFiles = getAllFiles('sdk');
      expect(sdkFiles.length).toBeGreaterThan(0);
      expect(sdkFiles.some(f => f.includes('mxsdk'))).toBe(true);
    });
  });

  describe('Service worker configuration', () => {
    it('should have correct service worker setup', () => {
      expect(fileContains('service-worker.js', 'workbox')).toBe(true);
      expect(fileContains('service-worker.js', 'registerRoute')).toBe(true);
      expect(fileContains('service-worker.js', 'api.mapbox.com')).toBe(true);
    });
  });

  describe('HTML file content', () => {
    it('should have correct meta tags', () => {
      expect(fileContains('index.html', '<meta name="viewport"')).toBe(true);
      expect(fileContains('index.html', '<meta name="description"')).toBe(true);
    });

    it('should include bundle scripts', () => {
      expect(fileContains('index.html', '<script')).toBe(true);
      expect(fileContains('static.html', '<script')).toBe(true);
    });
  });
});
