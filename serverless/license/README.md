# TableFlow license backend

This folder defines the production contract for the Founder Pro license service.

## Required endpoints

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