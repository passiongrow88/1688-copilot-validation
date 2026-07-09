# License Backend Local Test Report

## Scope

- Location: `serverless/license`
- Runtime: Node.js + TypeScript using Node 24 type stripping
- Local database: SQLite via `node:sqlite`
- Production status: local only, not deployed

## Implemented

- `POST /license/verify`
- `POST /stripe/webhook`
- License generation
- HMAC license hashing
- Active / revoked verification
- Duplicate webhook idempotency
- Input validation
- Basic in-memory rate limit structure
- Local SQLite development database
- `LicenseStore` interface for production database adapters
- `.env.example` with variable names only

## Security Notes

- No formal Stripe secret is committed.
- No webhook secret value is committed.
- Webhook signature verification is required.
- Full license keys are never logged by the server.
- Test-only webhook fixture and returned license key are gated to `NODE_ENV=test`.
- The Chrome extension must not contain Stripe secrets.

## Local Run Command

```text
cd C:\Users\ltc_o\90Days\1688-copilot-validation\serverless\license
C:\Users\ltc_o\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --experimental-strip-types src\server.ts
```

## Test Command

```text
cd C:\Users\ltc_o\90Days\1688-copilot-validation\serverless\license
C:\Users\ltc_o\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe --experimental-strip-types test\license.test.ts
```

Expected:

```text
license backend tests ok
```

## Tests Covered

- Valid license
- Invalid license
- Revoked license
- Duplicate webhook
- Missing Stripe signature
- Wrong Stripe signature
- Missing webhook fields
- Database duplicate record

## Deployment Notes

Production requires:

- HTTPS deployment platform
- Production database adapter implementing `LicenseStore`
- Formal Stripe Payment Link
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `LICENSE_SIGNING_SECRET`
- `DATABASE_URL`
- API domain to configure in TableFlow extension

Do not claim production billing or activation is live until these are configured and tested.
