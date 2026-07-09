import http from "node:http";
import { openSqliteStore } from "./db.ts";
import { createLicenseForEmail, maskLicenseKey, verifyLicense, verifyStripeSignature, type LicenseStore } from "./license.ts";

type Config = {
  port: number;
  databaseUrl: string;
  licenseSecret: string;
  stripeWebhookSecret: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
};

type JsonResponse = Record<string, unknown>;

export function loadConfig(env = process.env): Config {
  return {
    port: Number(env.PORT || 8787),
    databaseUrl: env.DATABASE_URL || "file:./dev.sqlite",
    licenseSecret: env.LICENSE_SIGNING_SECRET || "dev-only-license-secret",
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || "whsec_test_only",
    rateLimitWindowMs: Number(env.RATE_LIMIT_WINDOW_MS || 60000),
    rateLimitMax: Number(env.RATE_LIMIT_MAX || 60)
  };
}

function json(res: http.ServerResponse, status: number, body: JsonResponse) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

export function createRateLimiter(windowMs: number, max: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string, now = Date.now()) => {
    const current = hits.get(key);
    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    current.count += 1;
    return current.count <= max;
  };
}

function extractCheckoutEmail(event: any): string | null {
  return event?.data?.object?.customer_details?.email || event?.data?.object?.customer_email || null;
}

export function createServer(config: Config, store: LicenseStore) {
  const allowRequest = createRateLimiter(config.rateLimitWindowMs, config.rateLimitMax);

  return http.createServer(async (req, res) => {
    const ip = req.socket.remoteAddress || "unknown";
    if (!allowRequest(ip)) return json(res, 429, { error: "Rate limit exceeded." });

    if (req.method === "POST" && req.url === "/license/verify") {
      try {
        const body = JSON.parse(await readBody(req));
        if (typeof body.licenseKey !== "string") return json(res, 400, { active: false, message: "Missing licenseKey." });
        const result = verifyLicense({ licenseKey: body.licenseKey, secret: config.licenseSecret, store });
        return json(res, 200, result);
      } catch {
        return json(res, 400, { active: false, message: "Invalid JSON." });
      }
    }

    if (req.method === "POST" && req.url === "/stripe/webhook") {
      const payload = await readBody(req);
      if (!verifyStripeSignature(payload, req.headers["stripe-signature"] as string | undefined, config.stripeWebhookSecret)) {
        return json(res, 400, { error: "Invalid Stripe signature." });
      }

      let event: any;
      try {
        event = JSON.parse(payload);
      } catch {
        return json(res, 400, { error: "Invalid JSON." });
      }
      if (!event?.id || !event?.type) return json(res, 400, { error: "Missing event fields." });
      if (store.hasProcessedEvent(event.id)) return json(res, 200, { received: true, duplicate: true });

      if (event.type === "checkout.session.completed") {
        const email = extractCheckoutEmail(event);
        if (!email) return json(res, 400, { error: "Missing customer email." });
        const created = createLicenseForEmail({
          email,
          plan: "founder-pro",
          stripeEventId: event.id,
          secret: config.licenseSecret,
          store
        });
        store.recordProcessedEvent(event.id, new Date().toISOString());
        return json(res, 200, {
          received: true,
          licenseId: created.licenseId,
          licensePreview: maskLicenseKey(created.licenseKey),
          testOnlyLicenseKey: process.env.NODE_ENV === "test" ? created.licenseKey : undefined
        });
      }

      store.recordProcessedEvent(event.id, new Date().toISOString());
      return json(res, 200, { received: true, ignored: true });
    }

    return json(res, 404, { error: "Not found." });
  });
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  const config = loadConfig();
  const store = openSqliteStore(config.databaseUrl);
  createServer(config, store).listen(config.port, () => {
    console.log(`TableFlow license backend listening on http://127.0.0.1:${config.port}`);
  });
}
