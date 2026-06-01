import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

interface SessionRow extends RowDataPacket {
  id: number;
  status: "active" | "finished";
  word_bank: string;
  call_interval_seconds: number;
}
interface CalledWordRow extends RowDataPacket {
  word: string;
  call_order: number;
}

export async function GET() {
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
        call_interval_seconds: s.call_interval_seconds,
        word_bank: JSON.parse(s.word_bank) as string[],
        called_words: words.map(r => ({ word: r.word, call_order: r.call_order })),
      },
    });
  } finally {
    conn.release();
  }
}

export async function POST(req: Request) {
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
      "INSERT INTO bingo_sessions (status, word_bank, call_interval_seconds) VALUES ('active', ?, ?)",
      [JSON.stringify(word_bank), call_interval_seconds]
    );
    return NextResponse.json({
      session: {
        id: result.insertId,
        status: "active",
        call_interval_seconds,
        word_bank,
        called_words: [],
      },
    });
  } finally {
    conn.release();
  }
}

export async function PATCH(req: Request) {
  const { session_id, action } = await req.json() as {
    session_id: number;
    action: "finish";
  };
  const conn = await pool.getConnection();
  try {
    if (action === "finish") {
      await conn.execute(
        "UPDATE bingo_sessions SET status = 'finished' WHERE id = ?",
        [session_id]
      );
    }
    return NextResponse.json({ ok: true });
  } finally {
    conn.release();
  }
}
