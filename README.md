# TableFlow

TableFlow is a lightweight browser extension that turns HTML tables into clean, reusable data.

This repository is the **single official project** for the 90-day challenge to earn **USD 10,000 in revenue** from a browser extension.

## Current MVP — v0.1.0

TableFlow can:

- detect HTML tables on the active webpage;
- show a preview of the first five rows;
- export the selected table as CSV, JSON, or Markdown;
- copy the export to the clipboard;
- download the export as a local file;
- process everything locally in the browser.

## Repository structure

```text
extension/                 Installable Chrome/Edge extension source
AGENTS.md                  Product and engineering operating rules
PRIVACY.md                 Plain-language privacy policy
README.md                  Project overview and installation guide
index.html                 Existing 1688 validation landing page
app.js / styles.css        Existing landing-page assets
.github/workflows/pages.yml Existing GitHub Pages deployment
```

The old 1688 validation landing page remains at the repository root so the existing GitHub Pages site is not broken. New product development belongs in `extension/`.

## Install the extension locally

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome, or `edge://extensions` in Microsoft Edge.
3. Turn on **Developer mode**.
4. Choose **Load unpacked**.
5. Select the `extension` folder.
6. Open a webpage containing an HTML table.
7. Click the TableFlow extension icon, then click **Scan page**.

## Fast validation target

Before adding large features, validate that users will pay for the current workflow:

1. Show the extension to people who regularly copy data from supplier pages, directories, research pages, or admin systems.
2. Observe whether TableFlow saves meaningful time.
3. Ask for payment or a deposit for onboarding, customization, or early access.
4. Record objections and improve only the parts that block purchase or repeat use.

## Release status

- Product name: **TableFlow**
- Version: **0.1.0 MVP**
- Browser format: **Manifest V3**
- Store status: **Not yet published**
- Data handling: **Local-only; no automatic transmission**

See [`extension/README.md`](extension/README.md) for technical details and [`AGENTS.md`](AGENTS.md) for project priorities.
