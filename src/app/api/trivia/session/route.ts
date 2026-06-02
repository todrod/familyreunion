import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { TRIVIA_QUESTIONS, type TriviaQuestion } from "@/lib/trivia-questions";
import type mysql from "mysql2/promise";

interface SessionRow {
  id: number;
  status: "waiting" | "question" | "reveal" | "finished";
  current_question: number;
  questions: string | null;
  created_at: string;
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

// GET — players + host poll this to get game state (public; games are gated client-side)
export async function GET() {
  const [rows] = await pool.query(
    "SELECT * FROM trivia_sessions ORDER BY id DESC LIMIT 1"
  );
  const sessions = rows as SessionRow[];

  if (sessions.length === 0) {
    return NextResponse.json({ session: null });
  }

  const s = sessions[0];
  const questions = parseQuestions(s.questions);
  const q = s.current_question < questions.length ? questions[s.current_question] : null;

  // Strip the correct answer unless we're in reveal/finished mode
  const question = q
    ? (s.status === "reveal" || s.status === "finished")
      ? q
      : { question: q.question, options: q.options, category: q.category }
    : null;

  return NextResponse.json({
    session: {
      id: s.id,
      status: s.status,
      current_question: s.current_question,
      total_questions: questions.length,
      question,
    },
  });
}

// POST — host: create a new session with current question bank
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { questions?: TriviaQuestion[] };
  const questionsJson = JSON.stringify(
    Array.isArray(body.questions) && body.questions.length > 0
      ? body.questions
      : TRIVIA_QUESTIONS
  );

  const [result] = await pool.query(
    "INSERT INTO trivia_sessions (status, current_question, questions) VALUES ('waiting', 0, ?)",
    [questionsJson]
  );
  const id = (result as mysql.ResultSetHeader).insertId;
  return NextResponse.json({ id, status: "waiting", current_question: 0 }, { status: 201 });
}

// PATCH — host: advance state
export async function PATCH(req: NextRequest) {
  const { action, session_id } = await req.json() as { action: string; session_id: number };

  const [rows] = await pool.query("SELECT * FROM trivia_sessions WHERE id = ?", [session_id]);
  const session = (rows as SessionRow[])[0];
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const questions = parseQuestions(session.questions);
  let newStatus = session.status;
  let newQuestion = session.current_question;

  if (action === "start") {
    newStatus = "question";
  } else if (action === "reveal") {
    newStatus = "reveal";
  } else if (action === "next") {
    newQuestion = session.current_question + 1;
    newStatus = newQuestion >= questions.length ? "finished" : "question";
  } else if (action === "finish") {
    newStatus = "finished";
  } else if (action === "reset") {
    newStatus = "waiting";
    newQuestion = 0;
    await pool.query("DELETE FROM trivia_answers WHERE session_id = ?", [session_id]);
  }

  await pool.query(
    "UPDATE trivia_sessions SET status = ?, current_question = ? WHERE id = ?",
    [newStatus, newQuestion, session_id]
  );

  return NextResponse.json({ status: newStatus, current_question: newQuestion });
}
