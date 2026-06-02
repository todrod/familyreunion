import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureBingoSchema } from "@/lib/bingo";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

interface SessionRow extends RowDataPacket { word_bank: string; }
interface WordRow extends RowDataPacket { word: string; }

export async function POST(req: Request) {
  await ensureBingoSchema();
  const { session_id } = await req.json() as { session_id: number };
  const conn = await pool.getConnection();
  try {
    const [sessions] = await conn.execute<SessionRow[]>(
      "SELECT word_bank FROM bingo_sessions WHERE id = ? AND status = 'active'",
      [session_id]
    );
    if (!sessions.length) {
      return NextResponse.json({ error: "No active session" }, { status: 400 });
    }

    const wordBank: string[] = JSON.parse(sessions[0].word_bank);
    const [called] = await conn.execute<WordRow[]>(
      "SELECT word FROM bingo_called_words WHERE session_id = ?",
      [session_id]
    );
    const calledSet = new Set(called.map(r => r.word));
    const remaining = wordBank.filter(w => !calledSet.has(w));

    if (!remaining.length) {
      return NextResponse.json({ error: "All words called" }, { status: 400 });
    }

    const word = remaining[Math.floor(Math.random() * remaining.length)];
    const callOrder = called.length + 1;

    await conn.execute<ResultSetHeader>(
      "INSERT INTO bingo_called_words (session_id, word, call_order) VALUES (?, ?, ?)",
      [session_id, word, callOrder]
    );

    return NextResponse.json({ word, call_order: callOrder, remaining: remaining.length - 1 });
  } finally {
    conn.release();
  }
}
