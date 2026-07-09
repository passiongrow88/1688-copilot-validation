# TableFlow license backend

This folder contains the local TableFlow Founder Pro license backend prototype.

Status: local/test only. It is not deployed and is not connected to a formal Stripe account.

## Implemented endpoints

- `POST /stripe/webhook`
  - Verify the Stripe signature.
  - Handle successful checkout/payment events.
  - Generate one high-entropy license key.
  - Store only required license metadata.
  - Email or securely display the license to the purchaser.

- `POST /license/verify`
  - Request: `{ "licenseKey": "...", "extensionVersion": "0.2.0" }`
  - Success: `{ "active": true, "plan": "founder-pro" }`
  - Failure: `{ "active": false, "message": "..." }`

## Required environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `LICENSE_SIGNING_SECRET`
- `DATABASE_URL`
- `APP_BASE_URL`

Never place these values in the Chrome extension or commit them to GitHub.

See `.env.example` for variable names only.

## Minimal license record

- `license_id`
- `license_hash`
- `email_hash`
- `status`
- `plan`
- `created_at`
- `last_verified_at`
- `device_count`

## Release blocker

The extension intentionally ships with an empty `LICENSE_API_URL` on this branch. Production activation cannot work until a real HTTPS endpoint is deployed and configured.

## Local run

```text
C:\Users\ltc_o\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --experimental-strip-types src\server.ts
```

## Local test

```text
C:\Users\ltc_o\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --experimental-strip-types test\license.test.ts
```

Expected:

```text
license backend tests ok
```

The tests use Stripe-style signatures generated locally with `whsec_test_only`. These fixtures are TEST ONLY and are not production credentials.
