"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { Play, SkipForward, Eye, RotateCcw, Trophy, Users, Plus, X, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { TRIVIA_QUESTIONS, type TriviaQuestion } from "@/lib/trivia-questions";

const LS_QUESTIONS = "reunion_trivia_questions";
const LS_UNLOCKED = "reunion_host_unlocked";
// Change this password before the reunion
const HOST_PASSWORD = "Carol5260";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const OPTION_BG = ["bg-blue-600", "bg-amber-600", "bg-green-700", "bg-rose-700"];

const BLANK_Q: Omit<TriviaQuestion, "answer"> & { answer: string } = {
  question: "",
  options: ["", "", "", ""],
  answer: "A",
  category: "",
};

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

export default function TriviaHostPage() {
  // Password gate
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  // Question bank
  const [questions, setQuestions] = useState<TriviaQuestion[]>(TRIVIA_QUESTIONS);
  const [bankOpen, setBankOpen] = useState(false);
  const [newQ, setNewQ] = useState({ ...BLANK_Q });
  const [addOpen, setAddOpen] = useState(false);

  // Game state
  const [session, setSession] = useState<SessionState | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check unlock state on mount
  useEffect(() => {
    if (sessionStorage.getItem(LS_UNLOCKED) === "1") setUnlocked(true);
  }, []);

  // Load question bank from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_QUESTIONS);
      if (saved) {
        const parsed = JSON.parse(saved) as TriviaQuestion[];
        if (Array.isArray(parsed) && parsed.length > 0) setQuestions(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist question bank
  useEffect(() => {
    localStorage.setItem(LS_QUESTIONS, JSON.stringify(questions));
  }, [questions]);

  // Poll session
  useEffect(() => {
    if (!unlocked) return;
    fetchSession();
    pollRef.current = setInterval(fetchSession, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [unlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSession() {
    const res = await fetch("/api/trivia/session");
    if (!res.ok) return;
    const data = await res.json() as { session: SessionState | null };
    if (data.session) {
      setSession(data.session);
      if (data.session.status === "waiting") {
        fetchPlayers(data.session.id);
      }
      if (data.session.status === "question" || data.session.status === "reveal") {
        fetchAnswers(data.session.id, data.session.current_question);
      }
      if (data.session.status === "reveal" || data.session.status === "finished") {
        fetchLeaderboard(data.session.id);
      }
    }
  }

  async function fetchPlayers(sessionId: number) {
    const res = await fetch(`/api/trivia/players?session_id=${sessionId}`);
    if (!res.ok) return;
    const data = await res.json() as { players: PlayerRow[] };
    setPlayers(data.players);
  }

  async function fetchAnswers(sessionId: number, qIndex: number) {
    const res = await fetch(`/api/trivia/answer?session_id=${sessionId}&q=${qIndex}`);
    if (!res.ok) return;
    const data = await res.json() as { answers: AnswerRow[] };
    setAnswers(data.answers);
  }

  async function fetchLeaderboard(sessionId: number) {
    const res = await fetch(`/api/trivia/leaderboard?session_id=${sessionId}`);
    if (!res.ok) return;
    const data = await res.json() as { leaderboard: LeaderboardEntry[] };
    setLeaderboard(data.leaderboard);
  }

  async function doAction(act: string) {
    if (!session) return;
    setLoading(true);
    await fetch("/api/trivia/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, session_id: session.id }),
    });
    await fetchSession();
    setLoading(false);
  }

  async function newSession() {
    setLoading(true);
    setAnswers([]);
    setLeaderboard([]);
    setPlayers([]);
    await fetch("/api/trivia/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    await fetchSession();
    setLoading(false);
  }

  function unlockHost() {
    if (pwInput === HOST_PASSWORD) {
      sessionStorage.setItem(LS_UNLOCKED, "1");
      setUnlocked(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  }

  function addQuestion() {
    const q = newQ.question.trim();
    const opts = newQ.options.map((o) => o.trim()) as [string, string, string, string];
    if (!q || opts.some((o) => !o)) return;
    setQuestions((prev) => [...prev, { ...newQ, question: q, options: opts, answer: newQ.answer as TriviaQuestion["answer"] }]);
    setNewQ({ ...BLANK_Q });
    setAddOpen(false);
  }

  function removeQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function resetQuestions() {
    setQuestions(TRIVIA_QUESTIONS);
  }

  const answerTally: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const a of answers) answerTally[a.answer] = (answerTally[a.answer] ?? 0) + 1;
  const totalAnswers = answers.length;

  // ── Password gate ──────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <Lock className="mx-auto h-8 w-8 text-[#C99500]/70 mb-3" />
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Host Access</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the host password to continue</p>
          </div>
          <input
            type="password"
            value={pwInput}
            onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") unlockHost(); }}
            placeholder="Password…"
            className={`h-10 w-full rounded-xl border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${pwError ? "border-[#B84A28]/60 focus:ring-[#B84A28]/20" : "border-border focus:border-[#C99500]/60 focus:ring-[#C99500]/20"}`}
            autoFocus
          />
          {pwError && <p className="text-xs text-[#B84A28]">Incorrect password.</p>}
          <Button onClick={unlockHost} className="h-10 w-full bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
            Unlock
          </Button>
          <p className="text-center text-xs text-muted-foreground/50">
            Players join at <Link href="/games/trivia" className="underline">/games/trivia</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Host panel ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">

        {/* No session yet */}
        {!session ? (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <h1 className="text-2xl" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>Family Trivia — Host</h1>
            <p className="text-muted-foreground text-sm">
              {questions.length} question{questions.length !== 1 ? "s" : ""} in bank · Players join at <strong>/games/trivia</strong>
            </p>
            <Button onClick={newSession} disabled={loading || questions.length === 0}
              className="gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
              <Play className="h-4 w-4" /> Start New Game
            </Button>
          </div>
        ) : (
          <>
            {/* Status bar */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${session.status === "question" ? "bg-green-500 animate-pulse" : session.status === "reveal" ? "bg-[#C99500]" : session.status === "finished" ? "bg-rose-500" : "bg-zinc-500"}`} />
                <span className="text-sm font-medium capitalize text-foreground">{session.status}</span>
                {session.status !== "waiting" && session.status !== "finished" && (
                  <span className="text-xs text-muted-foreground">Q{session.current_question + 1} / {session.total_questions}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{totalAnswers} answered</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              {session.status === "question" && (
                <Button onClick={() => doAction("reveal")} disabled={loading} className="gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
                  <Eye className="h-4 w-4" /> Reveal Answer
                </Button>
              )}
              {session.status === "reveal" && (
                <Button onClick={() => doAction("next")} disabled={loading} className="gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
                  <SkipForward className="h-4 w-4" />
                  {session.current_question + 1 >= session.total_questions ? "Finish Game" : "Next Question"}
                </Button>
              )}
              {session.status === "finished" && (
                <Button onClick={newSession} disabled={loading} className="gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
                  <RotateCcw className="h-4 w-4" /> New Game
                </Button>
              )}
              {session.status !== "finished" && session.status !== "waiting" && (
                <Button variant="outline" onClick={() => doAction("reset")} disabled={loading} className="gap-2 text-xs">
                  <RotateCcw className="h-3 w-3" /> Reset
                </Button>
              )}
            </div>

            {/* Current question */}
            {session.question && session.status !== "waiting" && session.status !== "finished" && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="bg-gradient-to-r from-[#3D1204] to-[#2E1503] px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-[#A07035]">{session.question.category}</span>
                    <span className="text-xs text-[#7A5030]">Q{session.current_question + 1} of {session.total_questions}</span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-white leading-snug">{session.question.question}</p>
                </div>
                <div className="grid grid-cols-2 gap-px bg-border">
                  {session.question.options.map((opt, i) => {
                    const label = OPTION_LABELS[i];
                    const count = answerTally[label] ?? 0;
                    const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                    const isCorrect = session.status === "reveal" && label === session.question?.answer;
                    return (
                      <div key={label} className={`relative overflow-hidden px-4 py-3 ${OPTION_BG[i]} ${isCorrect ? "ring-2 ring-inset ring-white/50" : ""}`}>
                        <div className="absolute inset-0 bg-black/20" style={{ width: `${pct}%`, transition: "width 0.4s ease" }} />
                        <div className="relative flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">{label}</span>
                          <span className="flex-1 text-sm font-medium text-white">{opt}</span>
                          <span className="text-sm font-bold text-white/80">{count}</span>
                        </div>
                        {isCorrect && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-lg">✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {(session.status === "reveal" || session.status === "finished") && leaderboard.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#C99500]" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Leaderboard</h3>
                </div>
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                      <span className="w-6 text-center text-sm font-bold text-muted-foreground">#{i + 1}</span>
                      <span className="flex-1 text-sm font-medium text-foreground">{entry.name}</span>
                      <span className="text-sm font-bold text-[#C99500]">{entry.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {session.status === "waiting" && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#C99500]" />
                    <h3 className="text-sm font-semibold text-foreground">Players Joined</h3>
                  </div>
                  <span className="text-2xl font-black text-[#C99500]">{players.length}</span>
                </div>

                {players.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">Waiting for players…</p>
                    <p className="mt-1 text-xs text-muted-foreground/60">Players join at <strong>/games/trivia</strong></p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {players.map((p) => (
                      <span key={p.player_name}
                        className="inline-flex items-center rounded-full border border-[#C99500]/30 bg-[#C99500]/10 px-3 py-1 text-sm font-medium text-foreground">
                        {p.player_name}
                      </span>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => doAction("start")}
                  disabled={loading || players.length === 0}
                  className="w-full gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4] disabled:opacity-40"
                >
                  <Play className="h-4 w-4" />
                  {players.length === 0 ? "Waiting for players…" : `Start Game · ${players.length} player${players.length !== 1 ? "s" : ""}`}
                </Button>
              </div>
            )}

            {session.status === "finished" && (
              <div className="rounded-2xl border border-[#C99500]/30 bg-[#C99500]/5 px-6 py-8 text-center">
                <Trophy className="mx-auto h-10 w-10 text-[#C99500]" />
                <p className="mt-3 text-lg font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Game complete!</p>
                <p className="mt-1 text-sm text-muted-foreground">Edit the question bank below, then start a new game.</p>
              </div>
            )}
          </>
        )}

        {/* ── Question bank editor ────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex-1 cursor-pointer" onClick={() => setBankOpen((v) => !v)}>
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Question Bank</h2>
              <p className="text-xs text-muted-foreground">{questions.length} question{questions.length !== 1 ? "s" : ""} · shuffled each game</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={resetQuestions}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-[#C99500]/40 hover:text-foreground transition-colors">
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
              <button onClick={() => setBankOpen((v) => !v)} className="text-muted-foreground">
                {bankOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {bankOpen && (
            <div className="space-y-3">
              {/* Question list */}
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 bg-background px-3 py-2.5">
                    <span className="mt-0.5 min-w-[1.25rem] text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">{q.question}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {q.options.map((o, oi) => (
                          <span key={oi} className={`mr-2 ${OPTION_LABELS[oi] === q.answer ? "font-semibold text-green-600" : ""}`}>
                            {OPTION_LABELS[oi]}: {o}
                          </span>
                        ))}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60">{q.category}</span>
                    </div>
                    <button onClick={() => removeQuestion(i)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-[#B84A28] transition-colors"
                      aria-label="Remove question">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add question */}
              <button
                onClick={() => setAddOpen((v) => !v)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:border-[#C99500]/40 hover:text-foreground transition-colors"
              >
                <Plus className="h-4 w-4" /> Add Question
              </button>

              {addOpen && (
                <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Question text…"
                    value={newQ.question}
                    onChange={(e) => setNewQ((v) => ({ ...v, question: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#C99500]/60 focus:outline-none focus:ring-2 focus:ring-[#C99500]/20 transition-colors"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {OPTION_LABELS.map((label, i) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${OPTION_BG[i]}`}>{label}</span>
                        <input
                          type="text"
                          placeholder={`Option ${label}…`}
                          value={newQ.options[i]}
                          onChange={(e) => {
                            const opts = [...newQ.options] as [string, string, string, string];
                            opts[i] = e.target.value;
                            setNewQ((v) => ({ ...v, options: opts }));
                          }}
                          className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#C99500]/60 focus:outline-none focus:ring-1 focus:ring-[#C99500]/20 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Correct:</label>
                      <select
                        value={newQ.answer}
                        onChange={(e) => setNewQ((v) => ({ ...v, answer: e.target.value }))}
                        className="h-8 rounded-lg border border-border bg-card px-2 text-sm text-foreground focus:outline-none"
                      >
                        {OPTION_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="Category…"
                      value={newQ.category}
                      onChange={(e) => setNewQ((v) => ({ ...v, category: e.target.value }))}
                      className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#C99500]/60 focus:outline-none focus:ring-1 focus:ring-[#C99500]/20 transition-colors"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addQuestion} size="sm"
                      className="gap-1.5 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setAddOpen(false); setNewQ({ ...BLANK_Q }); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
