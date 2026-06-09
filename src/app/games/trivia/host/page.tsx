"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { Play, SkipForward, Eye, RotateCcw, Trophy, Users, Plus, X, ChevronDown, ChevronUp, Lock, Cast, MonitorPlay } from "lucide-react";
import { TRIVIA_QUESTIONS, TRIVIA_CATEGORIES, type TriviaQuestion } from "@/lib/trivia-questions";

const LS_QUESTIONS = "reunion_trivia_questions";
const LS_UNLOCKED = "reunion_host_unlocked";
// Change this password before the reunion
const HOST_PASSWORD = "Carol5260";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const OPTION_BG = ["bg-blue-600", "bg-amber-600", "bg-green-700", "bg-rose-700"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  const [castSupported, setCastSupported] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presentationRef = useRef<{ terminate?: () => void } | null>(null);

  // Check unlock state on mount
  useEffect(() => {
    if (sessionStorage.getItem(LS_UNLOCKED) === "1") setUnlocked(true);
  }, []);

  // Detect whether the browser can cast to a presentation display (Chromecast etc.)
  useEffect(() => {
    setCastSupported(typeof window !== "undefined" && "PresentationRequest" in window);
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

  // Start a game. Pass a category name to play just that section, or
  // nothing for a mixed game across the whole bank. Questions are shuffled.
  async function newSession(category?: string) {
    setLoading(true);
    setAnswers([]);
    setLeaderboard([]);
    setPlayers([]);
    const pickFrom = category ? questions.filter((q) => q.category === category) : questions;
    const gameQuestions = shuffle(pickFrom);
    await fetch("/api/trivia/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions: gameQuestions }),
    });
    await fetchSession();
    setLoading(false);
  }

  const categoryCount = (name: string) => questions.filter((q) => q.category === name).length;

  const displayUrl = () => `${window.location.origin}/games/trivia/display`;

  // Open the full-screen TV scoreboard in its own window (for HDMI / mirroring).
  function openDisplay() {
    window.open(displayUrl(), "reunion_tv_display");
  }

  // Cast the TV scoreboard to a Chromecast / presentation screen where supported,
  // otherwise just open it in a new window as a fallback.
  function castDisplay() {
    type PresentationConnection = { terminate?: () => void };
    type PresentationRequestCtor = new (urls: string[]) => { start: () => Promise<PresentationConnection> };
    const PR = (window as unknown as { PresentationRequest?: PresentationRequestCtor }).PresentationRequest;
    if (PR) {
      try {
        const req = new PR([displayUrl()]);
        req.start()
          .then((conn) => { presentationRef.current = conn; })
          .catch(() => openDisplay());
        return;
      } catch { /* fall through to window open */ }
    }
    openDisplay();
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
            <Lock className="mx-auto h-8 w-8 text-[#c28e2b]/70 mb-3" />
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Host Access</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the host password to continue</p>
          </div>
          <input
            type="password"
            value={pwInput}
            onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") unlockHost(); }}
            placeholder="Password…"
            className={`h-10 w-full rounded-xl border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${pwError ? "border-[#bf5a33]/60 focus:ring-[#bf5a33]/20" : "border-border focus:border-[#c28e2b]/60 focus:ring-[#c28e2b]/20"}`}
            autoFocus
          />
          {pwError && <p className="text-xs text-[#bf5a33]">Incorrect password.</p>}
          <Button onClick={unlockHost} className="h-10 w-full bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2]">
            Unlock
          </Button>
          <p className="text-center text-xs text-muted-foreground/50">
            Players join at <Link href="/games/trivia" className="underline">/games/trivia</Link>
          </p>
        </div>
      </div>
    );
  }

  // Category picker — shown before a game and after one finishes.
  const categoryPicker = (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>Family Trivia — Host</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a category to start a round · players join at <strong>/games/trivia</strong>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TRIVIA_CATEGORIES.map((cat) => {
          const count = categoryCount(cat.name);
          return (
            <button
              key={cat.name}
              onClick={() => newSession(cat.name)}
              disabled={loading || count === 0}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-3 py-5 text-center transition-colors hover:border-[#c28e2b]/50 hover:bg-[#c28e2b]/5 disabled:opacity-40"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-playfair)" }}>{cat.name}</span>
              <span className="text-xs text-muted-foreground">{count} question{count !== 1 ? "s" : ""}</span>
            </button>
          );
        })}
        <button
          onClick={() => newSession()}
          disabled={loading || questions.length === 0}
          className="flex flex-col items-center gap-1 rounded-2xl border border-[#c28e2b]/40 bg-[#c28e2b]/10 px-3 py-5 text-center transition-colors hover:bg-[#c28e2b]/15 disabled:opacity-40"
        >
          <span className="text-3xl">🎲</span>
          <span className="text-sm font-semibold text-[#c28e2b]" style={{ fontFamily: "var(--font-playfair)" }}>Mixed</span>
          <span className="text-xs text-muted-foreground">all {questions.length}</span>
        </button>
      </div>
    </div>
  );

  // ── Host panel ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">

        {/* TV display controls */}
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <MonitorPlay className="h-4 w-4 text-[#c28e2b]" /> TV Display
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              {castSupported && (
                <Button size="sm" variant="outline" onClick={castDisplay} className="gap-1.5">
                  <Cast className="h-3.5 w-3.5" /> Cast to TV
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={openDisplay} className="gap-1.5">
                <MonitorPlay className="h-3.5 w-3.5" /> Open Display
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Put the game on a big screen: <strong>Cast to TV</strong> for a Chromecast / Google TV, or <strong>Open Display</strong> then connect via HDMI or screen-mirroring and tap <em>Fullscreen</em>. The screen follows the game automatically.
          </p>
        </div>

        {/* No session yet — pick a category */}
        {!session ? (
          <div className="py-8">{categoryPicker}</div>
        ) : (
          <>
            {/* Status bar */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${session.status === "question" ? "bg-green-500 animate-pulse" : session.status === "reveal" ? "bg-[#c28e2b]" : session.status === "finished" ? "bg-rose-500" : "bg-zinc-500"}`} />
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
                <Button onClick={() => doAction("reveal")} disabled={loading} className="gap-2 bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2]">
                  <Eye className="h-4 w-4" /> Reveal Answer
                </Button>
              )}
              {session.status === "reveal" && (
                <Button onClick={() => doAction("next")} disabled={loading} className="gap-2 bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2]">
                  <SkipForward className="h-4 w-4" />
                  {session.current_question + 1 >= session.total_questions ? "Finish Game" : "Next Question"}
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
                <div className="bg-gradient-to-r from-[#1d4d33] to-[#14321f] px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-[#b39357]">{session.question.category}</span>
                    <span className="text-xs text-[#7a6a4a]">Q{session.current_question + 1} of {session.total_questions}</span>
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
                  <Trophy className="h-4 w-4 text-[#c28e2b]" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Leaderboard</h3>
                </div>
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                      <span className="w-6 text-center text-sm font-bold text-muted-foreground">#{i + 1}</span>
                      <span className="flex-1 text-sm font-medium text-foreground">{entry.name}</span>
                      <span className="text-sm font-bold text-[#c28e2b]">{entry.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {session.status === "waiting" && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#c28e2b]" />
                    <h3 className="text-sm font-semibold text-foreground">Players Joined</h3>
                  </div>
                  <span className="text-2xl font-black text-[#c28e2b]">{players.length}</span>
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
                        className="inline-flex items-center rounded-full border border-[#c28e2b]/30 bg-[#c28e2b]/10 px-3 py-1 text-sm font-medium text-foreground">
                        {p.player_name}
                      </span>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => doAction("start")}
                  disabled={loading || players.length === 0}
                  className="w-full gap-2 bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2] disabled:opacity-40"
                >
                  <Play className="h-4 w-4" />
                  {players.length === 0 ? "Waiting for players…" : `Start Game · ${players.length} player${players.length !== 1 ? "s" : ""}`}
                </Button>
              </div>
            )}

            {session.status === "finished" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#c28e2b]/30 bg-[#c28e2b]/5 px-6 py-6 text-center">
                  <Trophy className="mx-auto h-10 w-10 text-[#c28e2b]" />
                  <p className="mt-3 text-lg font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Game complete!</p>
                  <p className="mt-1 text-sm text-muted-foreground">Pick another category below to play again.</p>
                </div>
                {categoryPicker}
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
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-[#c28e2b]/40 hover:text-foreground transition-colors">
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
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-[#bf5a33] transition-colors"
                      aria-label="Remove question">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add question */}
              <button
                onClick={() => setAddOpen((v) => !v)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:border-[#c28e2b]/40 hover:text-foreground transition-colors"
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
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-2 focus:ring-[#c28e2b]/20 transition-colors"
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
                          className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-1 focus:ring-[#c28e2b]/20 transition-colors"
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
                      className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-1 focus:ring-[#c28e2b]/20 transition-colors"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addQuestion} size="sm"
                      className="gap-1.5 bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2]">
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
