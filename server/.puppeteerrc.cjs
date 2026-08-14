const { join } = require('path');

/**
 * Puppeteer Configuration File
 * Detects if running on Render and automatically directs the browser cache
 * to Render's persistent project cache directory, preventing environment mismatch.
 * 
 * @type {import("puppeteer").Configuration}
 */
const cacheDir = process.env.RENDER === 'true'
  ? '/opt/render/project/.cache/puppeteer'
  : join(__dirname, '.cache', 'puppeteer');

module.exports = {
  cacheDirectory: cacheDir,
};
