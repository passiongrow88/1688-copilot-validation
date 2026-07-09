import crypto from "node:crypto";

export type LicenseStatus = "active" | "revoked";

export type LicenseRecord = {
  licenseId: string;
  licenseHash: string;
  emailHash: string;
  status: LicenseStatus;
  plan: string;
  stripeEventId: string;
  createdAt: string;
  lastVerifiedAt: string | null;
};

export type LicenseStore = {
  createLicense(record: LicenseRecord): void;
  findLicenseByHash(licenseHash: string): LicenseRecord | null;
  markVerified(licenseHash: string, verifiedAt: string): void;
  hasProcessedEvent(eventId: string): boolean;
  recordProcessedEvent(eventId: string, processedAt: string): void;
};

export function hashValue(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function generateLicenseKey(): string {
  const raw = crypto.randomBytes(24).toString("base64url").toUpperCase();
  return `TFP-${raw.slice(0, 8)}-${raw.slice(8, 16)}-${raw.slice(16, 24)}`;
}

export function maskLicenseKey(key: string): string {
  return `****${key.slice(-4)}`;
}

export function createLicenseForEmail(args: {
  email: string;
  plan: string;
  stripeEventId: string;
  secret: string;
  store: LicenseStore;
  now?: string;
}): { licenseKey: string; licenseId: string } {
  const licenseKey = generateLicenseKey();
  const licenseId = crypto.randomUUID();
  const now = args.now || new Date().toISOString();
  args.store.createLicense({
    licenseId,
    licenseHash: hashValue(licenseKey, args.secret),
    emailHash: hashValue(args.email.toLowerCase(), args.secret),
    status: "active",
    plan: args.plan,
    stripeEventId: args.stripeEventId,
    createdAt: now,
    lastVerifiedAt: null
  });
  return { licenseKey, licenseId };
}

export function verifyLicense(args: {
  licenseKey: string;
  secret: string;
  store: LicenseStore;
  now?: string;
}): { active: boolean; plan?: string; message?: string } {
  const key = args.licenseKey.trim();
  if (!key) return { active: false, message: "Missing license key." };

  const licenseHash = hashValue(key, args.secret);
  const record = args.store.findLicenseByHash(licenseHash);
  if (!record) return { active: false, message: "Invalid license." };
  if (record.status !== "active") return { active: false, message: "License revoked." };

  args.store.markVerified(licenseHash, args.now || new Date().toISOString());
  return { active: true, plan: record.plan };
}

export function verifyStripeSignature(payload: string, signatureHeader: string | undefined, webhookSecret: string): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => {
    const [key, value] = part.split("=");
    return [key, value];
  }));
  if (!parts.t || !parts.v1) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(`${parts.t}.${payload}`).digest("hex");
  if (expected.length !== parts.v1.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

export function stripeTestSignature(payload: string, webhookSecret: string, timestamp = "12345"): string {
  const sig = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}
