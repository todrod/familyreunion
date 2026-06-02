import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { TRIVIA_QUESTIONS, type TriviaQuestion } from "@/lib/trivia-questions";

interface SessionRow {
  id: number;
  status: "waiting" | "question" | "reveal" | "finished";
  current_question: number;
  questions: string | null;
}

function parseQuestions(raw: string | null): TriviaQuestion[] {
  if (!raw) return TRIVIA_QUESTIONS;
  try {
    const parsed = JSON.parse(raw) as TriviaQuestion[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : TRIVIA_QUESTIONS;
  } catch {
    return TRIVIA_QUESTIONS;
  }
}

export async function POST(req: NextRequest) {
  const { session_id, player_name, answer } = await req.json() as {
    session_id: number;
    player_name: string;
    answer: string;
  };

  if (!session_id || !player_name || !answer) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const [rows] = await pool.query(
    "SELECT * FROM trivia_sessions WHERE id = ?",
    [session_id]
  );
  const session = (rows as SessionRow[])[0];
  if (!session || session.status !== "question") {
    return NextResponse.json({ error: "No active question" }, { status: 409 });
  }

  const questions = parseQuestions(session.questions);
  const qIndex = session.current_question;
  const correct = questions[qIndex]?.answer === answer.toUpperCase();

  await pool.query(
    `INSERT INTO trivia_answers (session_id, question_index, player_name, answer)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE answer = VALUES(answer)`,
    [session_id, qIndex, player_name, answer.toUpperCase()]
  );

  return NextResponse.json({ ok: true, correct });
}

// GET — get answers for current question (used during reveal)
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const qIndex = req.nextUrl.searchParams.get("q");

  const [rows] = await pool.query(
    "SELECT player_name, answer FROM trivia_answers WHERE session_id = ? AND question_index = ?",
    [sessionId, qIndex]
  );

  return NextResponse.json({ answers: rows });
}
