import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureBbqSchema, type BbqItem } from "@/lib/bbq";
import type mysql from "mysql2/promise";

async function getItem(id: number): Promise<BbqItem | null> {
  const [rows] = await pool.query("SELECT * FROM bbq_items WHERE id = ?", [id]);
  return ((rows as BbqItem[])[0]) ?? null;
}

// GET — everyone polls this for the live list.
export async function GET() {
  await ensureBbqSchema();
  const [rows] = await pool.query(
    "SELECT * FROM bbq_items ORDER BY sort_order ASC, id ASC"
  );
  return NextResponse.json({ items: rows });
}

// POST — add a new item someone is bringing.
export async function POST(req: NextRequest) {
  await ensureBbqSchema();
  const body = await req.json().catch(() => ({})) as {
    item?: string; amount?: string; unit?: string; name?: string;
  };
  const item = (body.item ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!item || !name) {
    return NextResponse.json({ error: "Item and name are required" }, { status: 400 });
  }

  const [result] = await pool.query(
    "INSERT INTO bbq_items (section, item, amount, unit, claimed_by, note, sort_order, is_default) VALUES ('Also Bringing', ?, ?, ?, ?, NULL, 900, 0)",
    [item, (body.amount ?? "").trim(), (body.unit ?? "").trim(), name]
  );
  const id = (result as mysql.ResultSetHeader).insertId;
  return NextResponse.json({ item: await getItem(id) }, { status: 201 });
}

// PATCH — claim a still-needed item, or release one you claimed.
export async function PATCH(req: NextRequest) {
  await ensureBbqSchema();
  const { id, name, action } = await req.json().catch(() => ({})) as {
    id?: number; name?: string; action?: "claim" | "release";
  };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (action === "release") {
    await pool.query("UPDATE bbq_items SET claimed_by = NULL WHERE id = ?", [id]);
  } else {
    const who = (name ?? "").trim();
    if (!who) return NextResponse.json({ error: "Name required" }, { status: 400 });
    // Only claim if it's still open, so two people can't grab the same item.
    await pool.query(
      "UPDATE bbq_items SET claimed_by = ? WHERE id = ? AND claimed_by IS NULL",
      [who, id]
    );
  }

  const updated = await getItem(id);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: updated });
}

// DELETE — remove a family-added item (defaults can't be deleted).
export async function DELETE(req: NextRequest) {
  await ensureBbqSchema();
  const { id } = await req.json().catch(() => ({})) as { id?: number };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await pool.query("DELETE FROM bbq_items WHERE id = ? AND is_default = 0", [id]);
  return NextResponse.json({ ok: true });
}
