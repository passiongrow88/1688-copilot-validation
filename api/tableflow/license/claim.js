const { createSign } = require("crypto");

const EXPECTED_AMOUNT = 2500;
const EXPECTED_CURRENCY = "usd";
const ISSUER = "tableflow-license";
const AUDIENCE = "tableflow-extension";

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sessionId = readSessionId(req);
    if (!sessionId || !sessionId.startsWith("cs_")) {
      return res.status(400).json({ error: "Missing checkout session." });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const privateKeyBase64 = process.env.TABLEFLOW_LICENSE_PRIVATE_KEY_B64;
    if (!stripeSecret || !privateKeyBase64) {
      return res.status(500).json({ error: "License service is not configured." });
    }

    const session = await stripeGet(
      stripeSecret,
      `/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items.data.price`
    );
    const validation = validateSession(session);
    if (!validation.ok) return res.status(403).json({ error: validation.error });

    const licensePayload = {
      iss: ISSUER,
      aud: AUDIENCE,
      sub: session.client_reference_id,
      installId: session.client_reference_id,
      plan: "pro_lifetime",
      status: "active",
      purchase: "stripe",
      sessionId: session.id,
      paymentLinkId: session.payment_link || "",
      priceId: validation.priceId,
      iat: Math.floor(Date.now() / 1000)
    };
    const privateKey = Buffer.from(privateKeyBase64, "base64").toString("utf8");
    const token = signJwt(licensePayload, privateKey);

    return res.status(200).json({ token, payload: licensePayload });
  } catch (_) {
    return res.status(500).json({ error: "Could not issue license." });
  }
};

function readSessionId(req) {
  if (req.query?.session_id) return String(req.query.session_id);
  if (req.body?.session_id) return String(req.body.session_id);
  return "";
}

function validateSession(session) {
  if (session.payment_status !== "paid") return { ok: false, error: "Checkout is not paid." };
  if (session.mode !== "payment") return { ok: false, error: "Checkout mode is not supported." };
  if (session.amount_total !== EXPECTED_AMOUNT) return { ok: false, error: "Checkout amount does not match." };
  if (session.currency !== EXPECTED_CURRENCY) return { ok: false, error: "Checkout currency does not match." };
  if (!session.client_reference_id) return { ok: false, error: "Missing extension install reference." };
  if (process.env.TABLEFLOW_PAYMENT_LINK_ID && session.payment_link !== process.env.TABLEFLOW_PAYMENT_LINK_ID) {
    return { ok: false, error: "Payment link does not match." };
  }

  const lineItem = session.line_items?.data?.[0];
  const priceId = lineItem?.price?.id || "";
  if (process.env.TABLEFLOW_PRICE_ID && priceId !== process.env.TABLEFLOW_PRICE_ID) {
    return { ok: false, error: "Price does not match." };
  }

  return { ok: true, priceId };
}

async function stripeGet(secret, path) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`
    }
  });
  if (!response.ok) throw new Error("Stripe request failed.");
  return response.json();
}

function signJwt(payload, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const input = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign("RSA-SHA256").update(input).end().sign(privateKey);
  return `${input}.${base64Url(signature)}`;
}

function base64Url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
