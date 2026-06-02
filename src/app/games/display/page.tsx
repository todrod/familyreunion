"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy, X } from "lucide-react";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const OPTION_BG = ["bg-blue-600", "bg-amber-600", "bg-green-700", "bg-rose-700"];
const OPTION_BORDER_CORRECT = "ring-4 ring-white/60";

interface SessionState {
  id: number;
  status: "waiting" | "question" | "reveal" | "finished";
  current_question: number;
  total_questions: number;
  question: {
    question: string;
    options: [string, string, string, string];
    category: string;
    answer?: string;
  } | null;
}

interface AnswerRow { player_name: string; answer: string; }
interface LeaderboardEntry { name: string; score: number; }
interface PlayerRow { player_name: string; }

export default function GamesDisplayPage() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);

  useEffect(() => {
    let prevId = -1;
    let prevQ = -1;

    const poll = async () => {
      try {
        const res = await fetch("/api/trivia/session");
        if (!res.ok) return;
        const data = await res.json() as { session: SessionState | null };
        if (!data.session) return;

        const s = data.session;

        if (s.id !== prevId || s.current_question !== prevQ) {
          setAnswers([]);
          prevId = s.id;
          prevQ = s.current_question;
        }

        setSession(s);

        if (s.status === "waiting") {
          const pr = await fetch(`/api/trivia/players?session_id=${s.id}`);
          if (pr.ok) {
            const pd = await pr.json() as { players: PlayerRow[] };
            setPlayers(pd.players);
          }
        }

        if (s.status === "question" || s.status === "reveal") {
          const ar = await fetch(`/api/trivia/answer?session_id=${s.id}&q=${s.current_question}`);
          if (ar.ok) {
            const ad = await ar.json() as { answers: AnswerRow[] };
            setAnswers(ad.answers);
          }
        }

        if (s.status === "reveal" || s.status === "finished") {
          const lr = await fetch(`/api/trivia/leaderboard?session_id=${s.id}`);
          if (lr.ok) {
            const ld = await lr.json() as { leaderboard: LeaderboardEntry[] };
            setLeaderboard(ld.leaderboard);
          }
        }
      } catch { /* ignore */ }
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  const answerTally: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const a of answers) answerTally[a.answer] = (answerTally[a.answer] ?? 0) + 1;
  const totalAnswers = answers.length;

  return (
    <div className="min-h-screen bg-[#1A0805] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Image src="/reunion-crest.webp" alt="crest" width={36} height={36} className="rounded-full opacity-80" style={{ width: "36px", height: "36px" }} />
          <span className="text-white/70 text-sm font-medium tracking-wide" style={{ fontFamily: "var(--font-playfair)" }}>
            14th Aversa Family Reunion · July 2026
          </span>
        </div>
        <div className="flex items-center gap-3">
          {session && session.status !== "waiting" && session.status !== "finished" && (
            <span className="text-white/40 text-sm">
              Question {session.current_question + 1} / {session.total_questions}
            </span>
          )}
          <Link href="/games"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/40 hover:border-white/20 hover:text-white/70 transition-colors">
            <X className="h-3 w-3" /> Exit TV Mode
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">

        {/* Idle — no active session */}
        {!session && (
          <div className="text-center space-y-4">
            <Image src="/reunion-crest.webp" alt="crest" width={80} height={80} className="mx-auto rounded-full opacity-60" style={{ width: "80px", height: "80px" }} />
            <h1 className="text-5xl text-white/80" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
              Family Games
            </h1>
            <p className="text-white/40 text-lg">Waiting for host to start a game…</p>
            <div className="mt-4 flex justify-center gap-6 text-white/30 text-sm">
              <span>Trivia → <strong className="text-white/50">/games/trivia</strong></span>
              <span>Bingo → <strong className="text-white/50">/games</strong></span>
            </div>
          </div>
        )}

        {/* Waiting — show player lobby */}
        {session?.status === "waiting" && (
          <div className="w-full max-w-3xl space-y-8 text-center">
            <div>
              <h1 className="text-6xl text-white" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
                Family Trivia
              </h1>
              <p className="mt-3 text-white/50 text-xl">Join on your phone at <strong className="text-[#C99500]">/games/trivia</strong></p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-6">
              <p className="text-[#C99500] text-5xl font-black">{players.length}</p>
              <p className="text-white/50 text-lg mt-1">player{players.length !== 1 ? "s" : ""} ready</p>
              {players.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {players.map((p) => (
                    <span key={p.player_name} className="rounded-full bg-white/10 px-4 py-1.5 text-base font-medium text-white/80">
                      {p.player_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active question */}
        {(session?.status === "question" || session?.status === "reveal") && session.question && (
          <div className="w-full max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-[#C99500]/40 bg-[#C99500]/10 px-4 py-1.5 text-sm font-medium text-[#C99500] uppercase tracking-wider">
                {session.question.category}
              </span>
              <span className="text-white/40 text-sm flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                {totalAnswers} answered
              </span>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-8">
              <p className="text-3xl md:text-4xl font-bold text-white leading-snug">
                {session.question.question}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {session.question.options.map((opt, i) => {
                const label = OPTION_LABELS[i];
                const count = answerTally[label] ?? 0;
                const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                const isReveal = session.status === "reveal";
                const isCorrect = isReveal && label === session.question?.answer;

                return (
                  <div key={label}
                    className={`relative overflow-hidden rounded-2xl ${OPTION_BG[i]} ${isCorrect ? OPTION_BORDER_CORRECT : ""} transition-all`}
                    style={{ opacity: isReveal && !isCorrect ? 0.45 : 1 }}
                  >
                    <div className="absolute inset-y-0 left-0 bg-black/25 transition-all duration-500" style={{ width: `${pct}%` }} />
                    <div className="relative flex items-center gap-4 px-5 py-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white">{label}</span>
                      <span className="flex-1 text-xl font-semibold text-white leading-tight">{opt}</span>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white">{count}</p>
                        {totalAnswers > 0 && <p className="text-xs text-white/60">{pct}%</p>}
                      </div>
                      {isCorrect && <span className="ml-1 text-2xl">✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {session.status === "reveal" && leaderboard.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
                <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Current standings</p>
                <div className="flex flex-wrap gap-3">
                  {leaderboard.slice(0, 6).map((e, i) => (
                    <div key={e.name} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                      <span className="text-xs font-bold text-white/40">#{i + 1}</span>
                      <span className="text-sm font-medium text-white">{e.name}</span>
                      <span className="text-sm font-bold text-[#C99500]">{e.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Final leaderboard */}
        {session?.status === "finished" && (
          <div className="w-full max-w-2xl space-y-6 text-center">
            <Trophy className="mx-auto h-16 w-16 text-[#C99500]" />
            <h1 className="text-5xl text-white" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
              Final Results
            </h1>
            <div className="space-y-3">
              {leaderboard.map((entry, i) => (
                <div key={entry.name}
                  className={`flex items-center gap-4 rounded-2xl px-6 py-4 ${i === 0 ? "bg-[#C99500]/20 border border-[#C99500]/40" : "bg-white/5 border border-white/10"}`}>
                  <span className={`text-2xl font-black ${i === 0 ? "text-[#C99500]" : "text-white/40"}`}>
                    {i === 0 ? "🏆" : `#${i + 1}`}
                  </span>
                  <span className="flex-1 text-left text-xl font-semibold text-white">{entry.name}</span>
                  <span className={`text-2xl font-black ${i === 0 ? "text-[#C99500]" : "text-white/70"}`}>{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
