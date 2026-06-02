import pool from "@/lib/db";

// Public event sign-up / "what I'm bringing" feature.
// The tables are created on demand and seeded with a few default events so the
// feature works on a fresh database with zero manual SQL.

export interface SignupEvent {
  id: number;
  emoji: string;
  title: string;
  date_label: string;
  description: string;
  sort_order: number;
}

export interface Contribution {
  id: number;
  event_id: number;
  name: string;
  item: string;
  created_at: string;
}

export const DEFAULT_EVENTS: Omit<SignupEvent, "id">[] = [
  {
    emoji: "🧺",
    title: "Saturday BBQ / Picnic",
    date_label: "Sat · July 18",
    description: "Cheesequake State Park. Bring a side, salad, dessert, or picnic gear to share!",
    sort_order: 1,
  },
  {
    emoji: "👋",
    title: "Friday Welcome Gathering",
    date_label: "Fri · July 17",
    description: "Light snacks and sweet treats to share in the hotel board room.",
    sort_order: 2,
  },
  {
    emoji: "🥤",
    title: "Drinks & Coolers",
    date_label: "All weekend",
    description: "Sodas, water, juice, ice, and coolers to keep everyone refreshed.",
    sort_order: 3,
  },
];

let ensured = false;

export async function ensureSignupSchema(): Promise<void> {
  if (ensured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS signup_events (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      emoji       VARCHAR(8)   NOT NULL DEFAULT '',
      title       VARCHAR(200) NOT NULL,
      date_label  VARCHAR(100) NOT NULL DEFAULT '',
      description TEXT,
      sort_order  INT          NOT NULL DEFAULT 0,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS signup_contributions (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      event_id    INT          NOT NULL,
      name        VARCHAR(100) NOT NULL,
      item        VARCHAR(255) NOT NULL,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_signup_event (event_id)
    )
  `);

  const [rows] = await pool.query("SELECT COUNT(*) AS c FROM signup_events");
  const count = (rows as { c: number }[])[0]?.c ?? 0;
  if (count === 0) {
    for (const e of DEFAULT_EVENTS) {
      await pool.query(
        "INSERT INTO signup_events (emoji, title, date_label, description, sort_order) VALUES (?, ?, ?, ?, ?)",
        [e.emoji, e.title, e.date_label, e.description, e.sort_order]
      );
    }
  }

  ensured = true;
}
