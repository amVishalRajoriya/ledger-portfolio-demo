const path = require('path');
const { buildWebApp } = require('./build-web');

const projectRoot = path.resolve(__dirname, '..');
const buildId = `portfolio-${Date.now()}`;
const domain = process.env.EXPO_PUBLIC_DOMAIN || 'localhost';

buildWebApp({
  projectRoot,
  buildId,
  domain,
  replId: process.env.EXPO_PUBLIC_REPL_ID || '',
  basePath: process.env.BASE_PATH || '',
}).catch((error) => {
  console.error('Portfolio web build failed:', error.message);
  process.exit(1);
});
