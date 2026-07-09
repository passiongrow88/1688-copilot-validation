# TableFlow Monetization Report

## Status

A cloud-safe v0.2 monetization branch has been created without changing the v0.1.0 version currently under Chrome Web Store review.

Branch: `feat/tableflow-v0.2-monetization`

## Implemented

- Extension version raised to `0.2.0` on the feature branch only.
- Added `Upgrade to Founder Pro · $39` button.
- Added a pricing page at `/tableflow-pricing/`.
- Added license-key activation and restore/free-plan controls.
- Added local license state storage through `chrome.storage.local`.
- Added a real Pro feature boundary: merge compatible tables with identical headers.
- Added graceful behavior when the production license service is not configured.
- Added a backend contract for Stripe webhook and license verification.
- Confirmed that no Stripe secret or payment credential is stored in the extension.

## Deliberately not completed

These items require production credentials or an approved external service and were not fabricated:

1. Live Stripe Payment Link for Founder Pro.
2. Deployed HTTPS license verification endpoint.
3. Stripe webhook secret and production database.
4. Email delivery of generated license keys.
5. End-to-end production payment test.

## Production configuration required

- Replace the disabled Founder Pro button on `tableflow-pricing/index.html` with the approved live Stripe Payment Link.
- Set `LICENSE_API_URL` in `extension/popup.js` to the deployed HTTPS backend.
- Add the matching backend host permission to the extension manifest if required by Chrome.
- Update privacy disclosures to explain license verification and the limited data sent to the license service.
- Test valid, invalid, revoked, offline, and restore-purchase flows.

## Release rule

Do not merge this branch into `main` and do not submit v0.2 to Chrome Web Store until the Founder approves the price, payment link, backend platform, privacy changes, and a full smoke test.