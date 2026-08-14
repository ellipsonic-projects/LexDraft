const { join } = require('path');

/**
 * Puppeteer Configuration File
 * Ensures the Chromium binary is downloaded directly into the node_modules folder,
 * which Render is guaranteed to copy from the build runner to the web runner.
 * 
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, 'node_modules', 'puppeteer_cache'),
};
