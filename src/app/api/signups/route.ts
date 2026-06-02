import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureSignupSchema } from "@/lib/signups";
import type mysql from "mysql2/promise";

// Public endpoint — no auth. Anyone attending can see and add contributions.
export async function GET() {
  await ensureSignupSchema();
  const [events] = await pool.query(
    "SELECT id, emoji, title, date_label, description, sort_order FROM signup_events ORDER BY sort_order ASC, id ASC"
  );
  const [contributions] = await pool.query(
    "SELECT id, event_id, name, item, created_at FROM signup_contributions ORDER BY created_at ASC"
  );
  return NextResponse.json({ events, contributions });
}

export async function POST(req: NextRequest) {
  await ensureSignupSchema();
  const body = await req.json();
  const event_id = Number(body.event_id);
  const name = String(body.name ?? "").trim();
  const item = String(body.item ?? "").trim();

  if (!event_id || !name || !item) {
    return NextResponse.json({ error: "event, name, and item are required" }, { status: 400 });
  }

  // Make sure the event exists before attaching a contribution to it.
  const [evRows] = await pool.query("SELECT id FROM signup_events WHERE id = ?", [event_id]);
  if ((evRows as unknown[]).length === 0) {
    return NextResponse.json({ error: "Unknown event" }, { status: 404 });
  }

  const [result] = await pool.query(
    "INSERT INTO signup_contributions (event_id, name, item) VALUES (?, ?, ?)",
    [event_id, name.slice(0, 100), item.slice(0, 255)]
  );
  const insertId = (result as mysql.ResultSetHeader).insertId;
  const [rows] = await pool.query(
    "SELECT id, event_id, name, item, created_at FROM signup_contributions WHERE id = ?",
    [insertId]
  );
  return NextResponse.json((rows as unknown[])[0], { status: 201 });
}
