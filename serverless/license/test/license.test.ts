import assert from "node:assert/strict";
import { openSqliteStore } from "../src/db.ts";
import { createServer, loadConfig } from "../src/server.ts";
import { hashValue, stripeTestSignature } from "../src/license.ts";

function listen(server: ReturnType<typeof createServer>): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No test port.");
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
  });
}

async function post(url: string, path: string, body: unknown, headers: Record<string, string> = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const response = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: payload
  });
  return { status: response.status, body: await response.json() };
}

const config = loadConfig({
  PORT: "0",
  DATABASE_URL: "file::memory:",
  LICENSE_SIGNING_SECRET: "test-license-secret",
  STRIPE_WEBHOOK_SECRET: "whsec_test_only",
  RATE_LIMIT_WINDOW_MS: "60000",
  RATE_LIMIT_MAX: "1000"
});
const store = openSqliteStore(config.databaseUrl);
const server = createServer(config, store);
const app = await listen(server);
process.env.NODE_ENV = "test";

try {
  const event = {
    id: "evt_test_1",
    type: "checkout.session.completed",
    data: { object: { customer_details: { email: "buyer@example.com" } } }
  };
  const payload = JSON.stringify(event);
  const signature = stripeTestSignature(payload, config.stripeWebhookSecret);

  const created = await post(app.url, "/stripe/webhook", payload, { "stripe-signature": signature });
  assert.equal(created.status, 200);
  assert.equal(created.body.received, true);
  assert.match(String(created.body.testOnlyLicenseKey), /^TFP-/);

  const valid = await post(app.url, "/license/verify", { licenseKey: created.body.testOnlyLicenseKey, extensionVersion: "0.2.0" });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.active, true);
  assert.equal(valid.body.plan, "founder-pro");

  const invalid = await post(app.url, "/license/verify", { licenseKey: "TFP-NOT-REAL", extensionVersion: "0.2.0" });
  assert.equal(invalid.body.active, false);
  assert.equal(invalid.body.message, "Invalid license.");

  const duplicate = await post(app.url, "/stripe/webhook", payload, { "stripe-signature": signature });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.duplicate, true);

  const missingSig = await post(app.url, "/stripe/webhook", payload);
  assert.equal(missingSig.status, 400);

  const badSig = await post(app.url, "/stripe/webhook", payload, { "stripe-signature": "t=12345,v1=bad" });
  assert.equal(badSig.status, 400);

  const missingFieldPayload = JSON.stringify({ id: "evt_missing" });
  const missingField = await post(app.url, "/stripe/webhook", missingFieldPayload, { "stripe-signature": stripeTestSignature(missingFieldPayload, config.stripeWebhookSecret) });
  assert.equal(missingField.status, 400);

  const hash = hashValue(String(created.body.testOnlyLicenseKey), config.licenseSecret);
  const record = store.findLicenseByHash(hash);
  assert.ok(record);
  assert.throws(() => store.createLicense({ ...record!, licenseId: "duplicate-id", stripeEventId: "evt_duplicate" }), /UNIQUE/);

  const dbAny = store as any;
  dbAny.close();
  const revokedStore = openSqliteStore("file::memory:");
  revokedStore.createLicense({ ...record!, status: "revoked", stripeEventId: "evt_revoked" });
  const revokedServer = createServer(config, revokedStore);
  const revokedApp = await listen(revokedServer);
  const revoked = await post(revokedApp.url, "/license/verify", { licenseKey: created.body.testOnlyLicenseKey });
  assert.equal(revoked.body.active, false);
  assert.equal(revoked.body.message, "License revoked.");
  await revokedApp.close();
  revokedStore.close();

  console.log("license backend tests ok");
} finally {
  await app.close();
}
