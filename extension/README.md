# TableFlow – MVP

A Manifest V3 Chrome extension that detects HTML tables on the active page and exports them as CSV, JSON, or Markdown.

## Install locally

1. Unzip this folder.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the unzipped `tableflow-extension` folder.
6. Open a webpage containing an HTML table and click TableFlow.

## MVP scope

- Detect visible HTML `<table>` elements.
- Preview the first five rows.
- Copy or download CSV, JSON, and Markdown.
- Local-only processing.
- Minimal permissions: active tab, scripting, downloads.

## Planned paid boundary

Free:
- Single-page table extraction.
- CSV/JSON/Markdown export.
- Up to 100 rows per export.

Pro:
- Repeated-list extraction (cards and search results).
- Multi-page and infinite-scroll capture.
- Saved extraction templates.
- Column cleanup and transformations.
- Google Sheets / Notion sync.
- Scheduled exports.

## Known limitations

- Version 0.1 only detects semantic HTML tables.
- It does not yet extract div-based repeated cards.
- Merged cells are flattened.
- Some protected browser pages cannot be scanned.
