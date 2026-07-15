# TableFlow Extension - MVP v0.1.3

TableFlow is a Manifest V3 browser extension that detects visible semantic HTML tables on the active webpage and exports them as CSV, JSON, Markdown, or Excel.

## Install locally

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Microsoft Edge.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `extension` folder.
5. Open a normal webpage containing an HTML table.
6. Click the TableFlow icon and choose **Scan this page**.

## Current scope

- Detect visible HTML `<table>` elements after the user clicks Scan.
- Preview the first five rows.
- Copy CSV, JSON, and Markdown.
- Download CSV, JSON, Markdown, and Excel.
- Export all detected rows.
- Keep all webpage processing inside the browser.
- Use only `activeTab`, `scripting`, `downloads`, and `storage` permissions.
- Use `storage` only to remember whether the local rating prompt was dismissed.

## Free

- Unlimited basic HTML table export
- CSV
- JSON
- Markdown
- Excel
- Local browser processing
- No AI credits
- No login
- 10 free exports per month

## TableFlow Pro Lifetime

- Lifetime price: USD 25 one time
- Unlimited exports after Stripe checkout
- Upcoming batch export
- Saved extraction templates
- Advanced extraction

The Pro purchase link is a public Stripe Payment Link. Stripe verifies payment on the hosted license endpoint and the extension stores only a signed license token. No Stripe secret key is stored in the extension.

## Known limitations

- Version 0.1 does not extract div-based cards or repeated lists.
- It scans only the current page; pagination and infinite scrolling are not supported.
- Merged cells are flattened.
- Some browser-internal or protected pages cannot be scanned.
- Complex interactive grids that do not use semantic table markup may not be detected.

## Candidate paid features — validate before building

- Repeated-list extraction for cards and search results.
- Multi-page and infinite-scroll capture.
- Saved extraction templates.
- Column cleanup and transformations.
- Google Sheets or Notion sync.
- Batch and scheduled exports.

These are hypotheses, not commitments. Build them only after a paying user confirms the need.

## Manual smoke test

1. Load the extension unpacked.
2. Visit a page with one or more visible HTML tables.
3. Confirm the table count and dimensions are correct.
4. Preview the first five rows.
5. Copy CSV, JSON, and Markdown.
6. Download each export format, including Excel, and open the saved file.
7. Confirm the extension reports a useful message on a page without tables.
