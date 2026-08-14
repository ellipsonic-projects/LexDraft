const { join } = require('path');

/**
 * Puppeteer Configuration File
 * Automatically selects the Render cache directory when running on Render,
 * and falls back to a local project cache directory for development.
 * 
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: process.env.PUPPETEER_CACHE_DIR || join(__dirname, '.cache', 'puppeteer'),
};
