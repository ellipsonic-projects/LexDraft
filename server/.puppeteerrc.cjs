const { join } = require('path');

/**
 * Puppeteer Configuration File
 * Ensures the Chromium binary is downloaded directly into the project directory
 * inside a non-hidden folder so it is preserved and copied to the Render web runner.
 * 
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, 'puppeteer_cache'),
};
