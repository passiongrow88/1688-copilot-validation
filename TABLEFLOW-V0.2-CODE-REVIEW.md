# TableFlow v0.2 Code Review

## Review Target

- Branch: `feat/tableflow-v0.2-monetization`
- PR: `https://github.com/passiongrow88/1688-copilot-validation/pull/2`
- Base: `main`
- Reviewed date: 2026-07-09

## Findings

### Fixed - High - Upgrade URL depended on unpublished GitHub Pages content

The popup originally opened `https://passiongrow88.github.io/1688-copilot-validation/tableflow-pricing/`. That URL is only reliable after the pricing page is published on the Pages branch. The extension now opens a packaged local `extension/pricing.html` via `chrome.runtime.getURL("pricing.html")`, so the upgrade page is reachable before production publishing.

### Fixed - High - Local storage plan state could unlock Pro

The popup previously restored Pro from `chrome.storage.local.tableflowPlan`. That treated local extension state as authority. The branch now defaults to Free on popup load and requires license verification again before Pro unlocks in the current popup session.

### Fixed - High - License key was stored in plaintext

The popup previously persisted `tableflowLicense`. It now stores only `tableflowLicenseLast4` and `tableflowLicenseVerifiedAt`. The full key is not persisted by the extension.

### Remaining - Production Blocker - License API not deployed

`LICENSE_API_URL` remains empty by design. Production license activation cannot work until Founder provides the deployed HTTPS backend URL and production Stripe setup.

### Remaining - Production Blocker - Stripe payment link not live

The pricing page accurately shows `Payment link pending`. No fake production payment link was added.

### Remaining - Security Limitation - Client-side gating is not license security

The merge feature is a local extension feature. Browser local state and client code can always be modified by a determined user. Production authorization should be enforced by server-controlled services for any server-side Pro capability. The current branch no longer treats stored local plan as production-trusted authority.

## Checklist

| Area | Status | Notes |
| --- | --- | --- |
| Manifest V3 compatibility | PASS | MV3 manifest version 3, popup-based extension. |
| `chrome.tabs.create` | PASS | Used for packaged pricing page URL. |
| Pricing page URL | PASS | Local packaged `chrome-extension://.../pricing.html`. |
| GitHub Pages not enabled failure | PASS | Upgrade no longer depends on GitHub Pages. |
| Content Security Policy | PASS | No inline extension script added. Local pricing page has no JS. |
| `chrome.storage.local` authorization risk | FIXED | Local plan is not restored as Pro. |
| Local plan as production authority | FIXED | Startup always returns to Free until verification. |
| License key plaintext storage | FIXED | Full key no longer persisted. |
| `LICENSE_API_URL` empty state | PASS | User sees production-not-connected message. |
| Network host permissions | PENDING PRODUCTION | Must add host permission once actual HTTPS API host is known. |
| Merge compatible tables | PASS | Covered by tests. |
| Header order and whitespace | PASS WITH LIMITATION | Extractor trims whitespace; merge requires exact post-cleaning header order. |
| CSV / JSON / Markdown regression | PASS | Covered by tests. |
| Free functionality intact | PASS | Serialization and non-merge export tested. |

## Automated Tests

Command:

```text
C:\Users\ltc_o\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe extension\popup.test.mjs
```

Result:

```text
popup tests ok
```

Covered:

- Free user clicking Merge is blocked.
- Pro test state merges same-header tables.
- Different headers do not merge.
- No compatible table shows a clear error.
- Clear license restores Free.
- API not configured.
- Network exception.
- Invalid license.
- Revoked license.
- License verification success.
- Free CSV / JSON / Markdown export serialization.

## PR Status

Keep PR #2 as Draft. Do not merge into `main` and do not submit v0.2 to Chrome Web Store until production payment, backend, privacy, and final smoke test are complete.
