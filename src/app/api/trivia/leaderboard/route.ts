import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { TRIVIA_QUESTIONS, type TriviaQuestion } from "@/lib/trivia-questions";

interface SessionRow { questions: string | null; }
interface AnswerRow { player_name: string; answer: string; question_index: number; }

function parseQuestions(raw: string | null): TriviaQuestion[] {
  if (!raw) return TRIVIA_QUESTIONS;
  try {
    const parsed = JSON.parse(raw) as TriviaQuestion[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : TRIVIA_QUESTIONS;
  } catch {
    return TRIVIA_QUESTIONS;
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  const [sessionRows] = await pool.query(
    "SELECT questions FROM trivia_sessions WHERE id = ?",
    [sessionId]
  );
  const session = (sessionRows as SessionRow[])[0];
  const questions = parseQuestions(session?.questions ?? null);

  const [rows] = await pool.query(
    "SELECT player_name, answer, question_index FROM trivia_answers WHERE session_id = ?",
    [sessionId]
  );

  const answers = rows as AnswerRow[];
  const scores: Record<string, number> = {};
  for (const row of answers) {
    const correct = questions[row.question_index]?.answer === row.answer;
    if (!scores[row.player_name]) scores[row.player_name] = 0;
    if (correct) scores[row.player_name]++;
  }

  const leaderboard = Object.entries(scores)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ leaderboard });
}
