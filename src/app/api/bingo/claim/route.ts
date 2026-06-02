import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureBingoSchema } from "@/lib/bingo";
import type { RowDataPacket } from "mysql2";

interface WordRow extends RowDataPacket { word: string; }
interface ClaimRow extends RowDataPacket {
  id: number;
  session_id: number;
  player_name: string;
  card_words: string;
  marked_indices: string;
  is_valid: number | null;
  claimed_at: string;
}

// All 12 winning lines on a 5×5 bingo card (index 0–24, FREE = 12)
const WIN_LINES = [
  [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24], [4, 8, 12, 16, 20],
];

function validate(cardWords: string[], markedIndices: number[], calledWords: Set<string>): boolean {
  // Build set of indices that are legitimately daubed: called word or FREE space (12)
  const valid = new Set(
    markedIndices.filter(i => i === 12 || calledWords.has(cardWords[i]))
  );
  valid.add(12); // FREE space always counts
  return WIN_LINES.some(line => line.every(i => valid.has(i)));
}

export async function POST(req: Request) {
  await ensureBingoSchema();
  const { session_id, player_name, card_words, marked_indices } = await req.json() as {
    session_id: number;
    player_name: string;
    card_words: string[];
    marked_indices: number[];
  };

  const conn = await pool.getConnection();
  try {
    const [called] = await conn.execute<WordRow[]>(
      "SELECT word FROM bingo_called_words WHERE session_id = ?",
      [session_id]
    );
    const calledSet = new Set(called.map(r => r.word));
    const isValid = validate(card_words, marked_indices, calledSet) ? 1 : 0;

    await conn.execute(
      `INSERT INTO bingo_claims (session_id, player_name, card_words, marked_indices, is_valid)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         card_words = VALUES(card_words),
         marked_indices = VALUES(marked_indices),
         is_valid = VALUES(is_valid),
         claimed_at = CURRENT_TIMESTAMP`,
      [session_id, player_name, JSON.stringify(card_words), JSON.stringify(marked_indices), isValid]
    );

    return NextResponse.json({ is_valid: isValid === 1 });
  } finally {
    conn.release();
  }
}

export async function GET(req: Request) {
  await ensureBingoSchema();
  const session_id = new URL(req.url).searchParams.get("session_id");
  const conn = await pool.getConnection();
  try {
    const [claims] = await conn.execute<ClaimRow[]>(
      "SELECT * FROM bingo_claims WHERE session_id = ? ORDER BY claimed_at DESC",
      [session_id]
    );
    return NextResponse.json({
      claims: claims.map(c => ({
        id: c.id,
        player_name: c.player_name,
        card_words: JSON.parse(c.card_words) as string[],
        marked_indices: JSON.parse(c.marked_indices) as number[],
        is_valid: c.is_valid,
        claimed_at: c.claimed_at,
      })),
    });
  } finally {
    conn.release();
  }
}
