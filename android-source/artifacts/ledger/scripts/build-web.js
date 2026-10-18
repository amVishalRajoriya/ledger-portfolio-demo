const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function runWebExport(projectRoot, outputDir, domain, replId, basePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      [
        'exec',
        'expo',
        'export',
        '--platform',
        'web',
        '--output-dir',
        outputDir,
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          EXPO_PUBLIC_DOMAIN: domain,
          EXPO_PUBLIC_REPL_ID: replId || '',
          EXPO_BASE_URL: basePath || '',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    child.stdout.on('data', (data) => process.stdout.write(`[Web] ${data}`));
    child.stderr.on('data', (data) => process.stderr.write(`[Web] ${data}`));
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Expo web export exited with status ${code}`));
    });
  });
}

function makePnpmAssetsVisible(outputDir) {
  const hiddenPnpmDir = path.join(outputDir, 'assets', '__node_modules', '.pnpm');
  if (!fs.existsSync(hiddenPnpmDir)) return;

  const visiblePnpmDir = path.join(outputDir, 'assets', '__node_modules', 'pnpm');
  if (fs.existsSync(visiblePnpmDir)) {
    throw new Error(`Cannot normalize Expo assets; destination already exists: ${visiblePnpmDir}`);
  }

  fs.renameSync(hiddenPnpmDir, visiblePnpmDir);

  const jsDir = path.join(outputDir, '_expo', 'static', 'js');
  for (const entry of fs.readdirSync(jsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const platformDir = path.join(jsDir, entry.name);
    for (const filename of fs.readdirSync(platformDir)) {
      if (!filename.endsWith('.js')) continue;
      const bundlePath = path.join(platformDir, filename);
      const bundle = fs.readFileSync(bundlePath, 'utf8');
      fs.writeFileSync(bundlePath, bundle.replaceAll('/.pnpm/', '/pnpm/'));
    }
  }
}

function normalizeBasePath(basePath = '') {
  const normalized = `/${String(basePath).trim().replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '' : normalized;
}

function prefixExportedAssetPaths(outputDir, basePath) {
  if (!basePath) return;

  const rewrite = (text) =>
    text.replace(
      /(["'(=])\/(?=(?:_expo|assets)\/|(?:favicon\.ico|icon\.png|manifest\.webmanifest|service-worker\.js)(?:["'?#]))/g,
      `$1${basePath}/`,
    );

  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (/\.(?:html|js|css)$/.test(entry.name)) {
        const contents = fs.readFileSync(filePath, 'utf8');
        fs.writeFileSync(filePath, rewrite(contents));
      }
    }
  };

  visit(outputDir);
}

function configureExpoRouterBaseUrl(outputDir, basePath) {
  if (!basePath) return;

  const jsDir = path.join(outputDir, '_expo', 'static', 'js');
  let routerHelpersUpdated = 0;

  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.name.endsWith('.js')) {
        let bundle = fs.readFileSync(filePath, 'utf8');
        bundle = bundle.replace(
          /(getUrlWithReactNavigationConcessions=function\([^,]+,[^=,)]+)=(""|'')/g,
          (_match, signature) => {
            routerHelpersUpdated += 1;
            return `${signature}=${JSON.stringify(basePath)}`;
          },
        );
        bundle = bundle.replace(
          /(appendBaseUrl=function\([^,]+,[^=,)]+)=(""|'')/g,
          (_match, signature) => {
            routerHelpersUpdated += 1;
            return `${signature}=${JSON.stringify(basePath)}`;
          },
        );
        fs.writeFileSync(filePath, bundle);
      }
    }
  };

  visit(jsDir);
  if (routerHelpersUpdated < 2) {
    throw new Error(
      `Could not configure Expo Router for base path "${basePath}"; expected router URL helpers in the web bundle.`,
    );
  }
}

function installPwaFiles(projectRoot, outputDir, buildId, basePath) {
  const pwaDir = path.join(projectRoot, 'pwa');
  const indexPath = path.join(outputDir, 'index.html');
  const manifestPath = path.join(pwaDir, 'manifest.webmanifest');
  const serviceWorkerPath = path.join(pwaDir, 'service-worker.js');
  const iconPath = path.join(projectRoot, 'assets', 'images', 'icon.png');

  for (const file of [indexPath, manifestPath, serviceWorkerPath, iconPath]) {
    if (!fs.existsSync(file)) {
      throw new Error(`Required web app file is missing: ${file}`);
    }
  }

  fs.copyFileSync(manifestPath, path.join(outputDir, 'manifest.webmanifest'));
  fs.copyFileSync(iconPath, path.join(outputDir, 'icon.png'));
  fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');
  const appImagesDir = path.join(outputDir, 'assets', 'images');
  fs.mkdirSync(appImagesDir, { recursive: true });
  fs.copyFileSync(iconPath, path.join(appImagesDir, 'icon.png'));

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const appRoot = `${basePath}/`;
  manifest.id = appRoot;
  manifest.start_url = appRoot;
  manifest.scope = appRoot;
  manifest.icons = manifest.icons.map((icon) => ({
    ...icon,
    src: `${basePath}/${icon.src.replace(/^\/+/, '')}`,
  }));
  fs.writeFileSync(
    path.join(outputDir, 'manifest.webmanifest'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const serviceWorker = fs
    .readFileSync(serviceWorkerPath, 'utf8')
    .replaceAll('__BUILD_ID__', buildId)
    .replaceAll('__BASE_PATH__', basePath);
  fs.writeFileSync(path.join(outputDir, 'service-worker.js'), serviceWorker);

  let html = fs.readFileSync(indexPath, 'utf8');
  const headMarkup = [
    '<meta name="description" content="A private, local-first ledger for Indian bank alerts, manual transactions, spending filters, and insights.">',
    '<meta name="theme-color" content="#24634f">',
    '<meta property="og:title" content="Ledger — private personal finance">',
    '<meta property="og:description" content="Track transactions from bank alerts and manual entries. Your ledger stays in your browser.">',
    '<meta property="og:type" content="website">',
    `<meta property="og:image" content="${basePath}/icon.png">`,
    `<link rel="manifest" href="${basePath}/manifest.webmanifest">`,
    `<link rel="apple-touch-icon" href="${basePath}/icon.png">`,
  ].join('\n');

  if (!html.includes('manifest.webmanifest')) {
    html = html.replace('</head>', `${headMarkup}\n</head>`);
  }

  const registrationScript =
    `<script>if ("serviceWorker" in navigator && location.protocol === "https:") { window.addEventListener("load", function () { navigator.serviceWorker.register("${basePath}/service-worker.js", { scope: "${appRoot}" }).catch(function (error) { console.warn("Ledger offline support could not be enabled.", error); }); }); }</script>`;
  if (!html.includes('service-worker.js')) {
    html = html.replace('</body>', `${registrationScript}\n</body>`);
  }

  fs.writeFileSync(indexPath, html);
  prefixExportedAssetPaths(outputDir, basePath);
}

async function buildWebApp({ projectRoot, buildId, domain, replId, basePath = process.env.BASE_PATH || '' }) {
  const outputDir = path.join(projectRoot, 'static-build', 'web');
  basePath = normalizeBasePath(basePath);
  console.log('Building Ledger web app and PWA assets...');
  await runWebExport(projectRoot, outputDir, domain, replId, basePath);
  makePnpmAssetsVisible(outputDir);
  configureExpoRouterBaseUrl(outputDir, basePath);
  installPwaFiles(projectRoot, outputDir, buildId, basePath);
  console.log('Web app export and PWA setup complete');
}

module.exports = { buildWebApp };
