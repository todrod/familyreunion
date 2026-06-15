import pool from "@/lib/db";

// Some databases were created before the phone/room_number columns existed,
// so inserts/updates that reference them fail with "Unknown column" (a 500).
// Ensure the table and those columns exist on demand, mirroring the
// self-provisioning pattern used by the signup/bingo tables — no manual SQL.

let ensured = false;

export async function ensureFamiliesSchema(): Promise<void> {
  if (ensured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS families (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      family_name       VARCHAR(255) NOT NULL,
      contact_name      VARCHAR(255) NOT NULL,
      rooms_requested   INT          NOT NULL DEFAULT 1,
      nights            INT          NOT NULL DEFAULT 2,
      hotel_preference  VARCHAR(100) NOT NULL DEFAULT '',
      has_pets          TINYINT(1)   NOT NULL DEFAULT 0,
      room_type         VARCHAR(50)  NOT NULL DEFAULT '',
      rsvp_status       VARCHAR(20)  NOT NULL DEFAULT 'interested',
      attendees         TEXT,
      phone             VARCHAR(20)  NOT NULL DEFAULT '',
      room_number       VARCHAR(10)  NOT NULL DEFAULT '',
      notes             TEXT,
      created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Backfill columns on databases that predate them. MariaDB supports
  // IF NOT EXISTS; the try/catch keeps a benign failure (column already
  // present) from ever blocking a request.
  for (const alter of [
    "ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NOT NULL DEFAULT ''",
    "ADD COLUMN IF NOT EXISTS room_number VARCHAR(10) NOT NULL DEFAULT ''",
  ]) {
    try {
      await pool.query(`ALTER TABLE families ${alter}`);
    } catch {
      // already exists, or engine lacks IF NOT EXISTS — safe to ignore
    }
  }

  ensured = true;
}
