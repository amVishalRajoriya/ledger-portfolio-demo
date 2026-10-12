# Ledger — portfolio web demo

This is the static, browser-based Ledger demo. It uses fictional sample data and keeps its data in the visitor's browser. It does not need a server or bank login.

## Features to show

- Explore sample transactions, accounts, spending summaries, and insights.
- Add, edit, delete, search, and filter transactions.
- Filter transaction history by period, including the current year.
- Enter transactions with the separate manual-entry form.
- Paste a bank alert for on-device parsing; uncertain alerts can be reviewed before import.
- Install the browser demo as a Home Screen web app on supported devices.

## Important demo limits

- Do not enter real banking messages or personal financial data into the public demo.
- The browser demo's local storage is not protected like files in a standalone iOS build.
- Automatic Messages Shortcuts and iOS file protection require a native iOS build; they are not available in this web demo.
- The demo does not read a phone's existing SMS history.

## Build the deployable website

From the repository root, run:

```sh
pnpm install
pnpm --filter @workspace/ledger run build:web
```

The finished static website is written to `artifacts/ledger/static-build/web/`.
For a normal site root or custom domain, run the build without `BASE_PATH`. For a GitHub Pages project site, build with the repository path:

```sh
BASE_PATH=/ledger-portfolio-demo pnpm --filter @workspace/ledger run build:web
```

Upload the **contents** of that folder to the site root. `BASE_PATH` prefixes Expo assets and PWA paths so the demo works at `https://YOUR-USERNAME.github.io/ledger-portfolio-demo/`; leave it empty when publishing at a domain root.
Keep the `assets/` and `_expo/` folders when uploading. The build renames Expo's hidden `.pnpm` asset directory to a visible `pnpm` directory and updates the bundle references, so the GitHub web uploader can include those files.

## Embed the demo on a portfolio page

The live demo is available at:

https://amvishalrajoriya.github.io/ledger-portfolio-demo/

Use this iframe snippet to embed it:

```html
<iframe
  src="https://amvishalrajoriya.github.io/ledger-portfolio-demo/"
  title="Ledger personal finance app demo"
  loading="lazy"
  style="width:100%;height:850px;border:0;border-radius:16px"
  allow="clipboard-read; clipboard-write"
></iframe>
```

## GitHub Pages

The source repository is https://github.com/amVishalRajoriya/ledger-portfolio-demo/.
GitHub Pages publishes the `main` branch root at https://amvishalrajoriya.github.io/ledger-portfolio-demo/.

The downloadable portfolio bundle includes the built site, this guide, and an iframe snippet.
