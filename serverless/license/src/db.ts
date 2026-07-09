import { DatabaseSync } from "node:sqlite";
import type { LicenseRecord, LicenseStore } from "./license.ts";

export function openSqliteStore(databaseUrl: string): LicenseStore & { close(): void } {
  const filename = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl;
  const db = new DatabaseSync(filename);
  db.exec(`
    CREATE TABLE IF NOT EXISTS licenses (
      license_id TEXT PRIMARY KEY,
      license_hash TEXT NOT NULL UNIQUE,
      email_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      plan TEXT NOT NULL,
      stripe_event_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      last_verified_at TEXT
    );
    CREATE TABLE IF NOT EXISTS processed_events (
      event_id TEXT PRIMARY KEY,
      processed_at TEXT NOT NULL
    );
  `);

  return {
    createLicense(record: LicenseRecord) {
      db.prepare(`
        INSERT INTO licenses
          (license_id, license_hash, email_hash, status, plan, stripe_event_id, created_at, last_verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(record.licenseId, record.licenseHash, record.emailHash, record.status, record.plan, record.stripeEventId, record.createdAt, record.lastVerifiedAt);
    },
    findLicenseByHash(licenseHash: string): LicenseRecord | null {
      const row = db.prepare("SELECT * FROM licenses WHERE license_hash = ?").get(licenseHash) as Record<string, string | null> | undefined;
      if (!row) return null;
      return {
        licenseId: row.license_id as string,
        licenseHash: row.license_hash as string,
        emailHash: row.email_hash as string,
        status: row.status as "active" | "revoked",
        plan: row.plan as string,
        stripeEventId: row.stripe_event_id as string,
        createdAt: row.created_at as string,
        lastVerifiedAt: row.last_verified_at
      };
    },
    markVerified(licenseHash: string, verifiedAt: string) {
      db.prepare("UPDATE licenses SET last_verified_at = ? WHERE license_hash = ?").run(verifiedAt, licenseHash);
    },
    hasProcessedEvent(eventId: string) {
      return Boolean(db.prepare("SELECT event_id FROM processed_events WHERE event_id = ?").get(eventId));
    },
    recordProcessedEvent(eventId: string, processedAt: string) {
      db.prepare("INSERT OR IGNORE INTO processed_events (event_id, processed_at) VALUES (?, ?)").run(eventId, processedAt);
    },
    close() {
      db.close();
    }
  };
}
