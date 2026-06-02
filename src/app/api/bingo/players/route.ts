import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureBingoSchema } from "@/lib/bingo";
import type { RowDataPacket } from "mysql2";

interface PlayerRow extends RowDataPacket { player_name: string; joined_at: string; }

// GET — list players who have joined a session (host roster)
export async function GET(req: NextRequest) {
  await ensureBingoSchema();
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  const [rows] = await pool.query<PlayerRow[]>(
    "SELECT player_name, joined_at FROM bingo_players WHERE session_id = ? ORDER BY joined_at ASC",
    [sessionId]
  );
  return NextResponse.json({ players: rows });
}

// POST — register a player into a session lobby
export async function POST(req: NextRequest) {
  await ensureBingoSchema();
  const { session_id, player_name } = await req.json() as { session_id: number; player_name: string };
  if (!session_id || !player_name?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO bingo_players (session_id, player_name) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE joined_at = joined_at`,
    [session_id, player_name.trim().slice(0, 100)]
  );
  return NextResponse.json({ ok: true });
}
