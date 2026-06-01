import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifySession } from "@/lib/auth";

interface PlayerRow { player_name: string; joined_at: string; }

// GET — list players in a session
export async function GET(req: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  const [rows] = await pool.query(
    "SELECT player_name, joined_at FROM trivia_players WHERE session_id = ? ORDER BY joined_at ASC",
    [sessionId]
  );

  return NextResponse.json({ players: rows as PlayerRow[] });
}

// POST — register a player into a session
export async function POST(req: NextRequest) {
  if (!await verifySession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session_id, player_name } = await req.json() as {
    session_id: number;
    player_name: string;
  };

  if (!session_id || !player_name?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO trivia_players (session_id, player_name) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE joined_at = joined_at`,
    [session_id, player_name.trim()]
  );

  return NextResponse.json({ ok: true });
}
