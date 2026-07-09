# TF-003 Implementation Status

## Branch

- Branch: `feat/tableflow-v0.2-monetization`
- Status: Draft PR implementation improved locally
- Main impact: none; `main` remains v0.1.0 under review

## Implemented

- `manifest.json` version remains `0.2.0` on this feature branch.
- `chrome.storage` permission retained for non-sensitive license metadata.
- Upgrade button opens packaged local `pricing.html`.
- Pricing page clearly says payment link is pending.
- License input supports production API verification once configured.
- Full license key is not persisted.
- Local stored plan no longer unlocks Pro after popup restart.
- Clear license returns to Free.
- First Pro feature remains compatible multi-table merge.
- Popup unit tests added at `extension/popup.test.mjs`.

## Not Implemented Yet

- Production Stripe Payment Link.
- Production license API URL.
- Host permission for the final license API host.
- Production backend deployment.
- End-to-end real payment to license activation.
- Chrome Web Store v0.2 submission.

## Founder Actions

- Provide approved Stripe Payment Link.
- Choose production deployment platform for license backend.
- Provide production API domain.
- Approve privacy policy update for license verification.
- Approve final v0.2 release scope.

## Test Evidence

```text
C:\Users\ltc_o\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe extension\popup.test.mjs
popup tests ok
```

## Current Risk Level

- Local v0.2 branch: acceptable for Draft PR continuation.
- Production release: blocked until payment and backend configuration exist.
