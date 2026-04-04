import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifySession } from "@/lib/auth";
import type mysql from "mysql2/promise";

export async function GET() {
  if (!await verifySession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rows] = await pool.query(
    "SELECT * FROM families ORDER BY created_at ASC"
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { family_name, contact_name, rooms_requested, nights, attendees, notes } = body;

  if (!family_name || !contact_name) {
    return NextResponse.json({ error: "Family name and contact are required" }, { status: 400 });
  }

  const [result] = await pool.query(
    `INSERT INTO families (family_name, contact_name, rooms_requested, nights, attendees, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      family_name,
      contact_name,
      Number(rooms_requested) || 1,
      Number(nights) || 3,
      attendees || "",
      notes || "",
    ]
  );

  const insertResult = result as mysql.ResultSetHeader;
  const [rows] = await pool.query("SELECT * FROM families WHERE id = ?", [insertResult.insertId]);
  return NextResponse.json((rows as unknown[])[0], { status: 201 });
}
