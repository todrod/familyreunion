import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureBingoSchema } from "@/lib/bingo";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

interface SessionRow extends RowDataPacket {
  id: number;
  status: "active" | "finished";
  word_bank: string;
  call_interval_seconds: number;
  started: number;
}
interface CalledWordRow extends RowDataPacket {
  word: string;
  call_order: number;
}

export async function GET() {
  await ensureBingoSchema();
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute<SessionRow[]>(
      "SELECT * FROM bingo_sessions WHERE status = 'active' ORDER BY id DESC LIMIT 1"
    );
    if (!rows.length) return NextResponse.json({ session: null });

    const s = rows[0];
    const [words] = await conn.execute<CalledWordRow[]>(
      "SELECT word, call_order FROM bingo_called_words WHERE session_id = ? ORDER BY call_order",
      [s.id]
    );

    return NextResponse.json({
      session: {
        id: s.id,
        status: s.status,
        started: s.started === 1,
        call_interval_seconds: s.call_interval_seconds,
        word_bank: JSON.parse(s.word_bank) as string[],
        called_words: words.map(r => ({ word: r.word, call_order: r.call_order })),
      },
    });
  } finally {
    conn.release();
  }
}

// POST — host opens a new lobby (players can join; calling starts after "start")
export async function POST(req: Request) {
  await ensureBingoSchema();
  const { word_bank, call_interval_seconds = 15 } = await req.json() as {
    word_bank: string[];
    call_interval_seconds?: number;
  };

  const conn = await pool.getConnection();
  try {
    // Finish any existing active session
    await conn.execute(
      "UPDATE bingo_sessions SET status = 'finished' WHERE status = 'active'"
    );
    const [result] = await conn.execute<ResultSetHeader>(
      "INSERT INTO bingo_sessions (status, word_bank, call_interval_seconds, started) VALUES ('active', ?, ?, 0)",
      [JSON.stringify(word_bank), call_interval_seconds]
    );
    return NextResponse.json({
      session: {
        id: result.insertId,
        status: "active",
        started: false,
        call_interval_seconds,
        word_bank,
        called_words: [],
      },
    });
  } finally {
    conn.release();
  }
}

// PATCH — host: "start" begins play, "finish" ends the game
export async function PATCH(req: Request) {
  await ensureBingoSchema();
  const { session_id, action } = await req.json() as {
    session_id: number;
    action: "finish" | "start";
  };
  const conn = await pool.getConnection();
  try {
    if (action === "finish") {
      await conn.execute(
        "UPDATE bingo_sessions SET status = 'finished' WHERE id = ?",
        [session_id]
      );
    } else if (action === "start") {
      await conn.execute(
        "UPDATE bingo_sessions SET started = 1 WHERE id = ?",
        [session_id]
      );
    }
    return NextResponse.json({ ok: true });
  } finally {
    conn.release();
  }
}
