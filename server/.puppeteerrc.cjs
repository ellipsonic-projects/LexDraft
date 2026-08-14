const { join } = require('path');

/**
 * Puppeteer Configuration File
 * Ensures the Chromium binary is downloaded directly into the project directory
 * so it is cached and copied from the build runner to the web runner on Render.
 * 
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
