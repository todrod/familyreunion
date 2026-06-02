"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Play, SkipForward, Eye, RotateCcw, Trophy, Users,
  Plus, X, ChevronDown, ChevronUp, Lock,
  Megaphone, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { TRIVIA_QUESTIONS, type TriviaQuestion } from "@/lib/trivia-questions";
import { SiteNav } from "@/components/site-nav";

// ── Constants ────────────────────────────────────────────────────────────────
const HOST_PASSWORD = "Carol5260";
const LS_UNLOCKED   = "reunion_host_unlocked";
const LS_TRIVIA_Q   = "reunion_trivia_questions";
const LS_BINGO_W    = "reunion_bingo_words";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const OPTION_BG     = ["bg-blue-600", "bg-amber-600", "bg-green-700", "bg-rose-700"];

const BLANK_Q: Omit<TriviaQuestion, "answer"> & { answer: string } = {
  question: "", options: ["", "", "", ""], answer: "A", category: "",
};

const INTERVAL_OPTIONS = [10, 15, 20, 30, 45];

// ── Types ────────────────────────────────────────────────────────────────────
interface TriviaSession {
  id: number;
  status: "waiting" | "question" | "reveal" | "finished";
  current_question: number;
  total_questions: number;
  question: { question: string; options: [string,string,string,string]; category: string; answer?: string } | null;
}
interface BingoSession {
  id: number;
  status: "active" | "finished";
  call_interval_seconds: number;
  word_bank: string[];
  called_words: { word: string; call_order: number }[];
}
interface BingoClaim {
  id: number;
  player_name: string;
  card_words: string[];
  marked_indices: number[];
  is_valid: number | null;
  claimed_at: string;
}
interface AnswerRow { player_name: string; answer: string; }
interface LeaderboardEntry { name: string; score: number; }
interface PlayerRow { player_name: string; }

// ── Component ─────────────────────────────────────────────────────────────────
export default function HostPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput]   = useState("");
  const [pwError, setPwError]   = useState(false);
  const [tab, setTab]           = useState<"bingo" | "trivia">("bingo");

  // ── Check unlock on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (sessionStorage.getItem(LS_UNLOCKED) === "1") setUnlocked(true);
  }, []);

  function unlock() {
    if (pwInput === HOST_PASSWORD) {
      sessionStorage.setItem(LS_UNLOCKED, "1");
      setUnlocked(true); setPwError(false);
    } else { setPwError(true); }
  }

  // ── Password gate ──────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <Lock className="mx-auto h-8 w-8 text-[#C99500]/70 mb-3" />
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Host Access</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the host password to continue</p>
          </div>
          <input type="password" value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e => { if (e.key === "Enter") unlock(); }}
            placeholder="Password…"
            className={`h-10 w-full rounded-xl border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${pwError ? "border-[#B84A28]/60 focus:ring-[#B84A28]/20" : "border-border focus:border-[#C99500]/60 focus:ring-[#C99500]/20"}`}
            autoFocus
          />
          {pwError && <p className="text-xs text-[#B84A28]">Incorrect password.</p>}
          <Button onClick={unlock} className="h-10 w-full bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">Unlock</Button>
        </div>
      </div>
    );
  }

  // ── Host panel ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">

        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
          {(["bingo", "trivia"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors capitalize ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "bingo" ? "🟡 Bingo" : "❓ Trivia"}
            </button>
          ))}
        </div>

        {tab === "bingo" ? <BingoHostPanel /> : <TriviaHostPanel />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BINGO HOST PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function BingoHostPanel() {
  const [session, setSession]       = useState<BingoSession | null>(null);
  const [callInterval, setCallInterval] = useState(15);
  const [countdown, setCountdown]   = useState<number | null>(null);
  const [calling, setCalling]       = useState(false);
  const [claims, setClaims]         = useState<BingoClaim[]>([]);
  const [dismissed, setDismissed]   = useState<Set<number>>(new Set());
  const [wordBank, setWordBank]     = useState<string[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load word bank from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_BINGO_W);
      if (saved) { const p = JSON.parse(saved) as string[]; if (p.length > 0) { setWordBank(p); return; } }
    } catch { /* ignore */ }
    // Default words fallback — same list as the bingo player page
    setWordBank([
      "Aversa","The Cousins","The Aunts","The Uncles","Grandma's Recipe","The Baby","The Newlyweds",
      "Long Lost Cousin","Family Historian","The Organizer","The Kids Table","Uncle with Stories",
      "Matching Outfits","The Early Bird","The Night Owl","Group Photo","Selfie Time","Happy Tears",
      "Big Hugs","Remember When","Old Photos","First to Pool","Last to Bed","Baby Photos","Best Dancer",
      "Nap After Brunch","Double Seconds","Loud Laughing","Same Story Again","Lost Hotel Key",
      "Wrong Room Floor","Elevator Wait","WiFi Password","Hampton Inn","Old Bridge NJ","Indoor Pool",
      "Hot Breakfast","Jersey Shore","Lobby Hangout","Room Service","Pool Float","Welcome Toast",
      "Farewell Brunch","Late Night Chat","Breakfast Table","Pool Cannonball","Family Trivia",
      "Card Game","Photo Slideshow","Dance Circle","14th Reunion","Summer 2026","Family Roots",
      "New Faces","Old Friends","Jersey Pride","Memory Lane","Road Trip Story","Keep in Touch",
      "Family Tree","All Together","Next Reunion",
    ]);
  }, []);

  // Poll session + claims
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/bingo/session");
        if (!res.ok) return;
        const data = await res.json() as { session: BingoSession | null };
        setSession(data.session);
        if (data.session) {
          const cr = await fetch(`/api/bingo/claim?session_id=${data.session.id}`);
          if (cr.ok) { const cd = await cr.json() as { claims: BingoClaim[] }; setClaims(cd.claims); }
        }
      } catch { /* ignore */ }
    };
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function startCountdown(seconds: number) {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function startGame() {
    const res = await fetch("/api/bingo/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word_bank: wordBank, call_interval_seconds: callInterval }),
    });
    const data = await res.json() as { session: BingoSession };
    setSession(data.session);
    setClaims([]);
    setDismissed(new Set());
    setCountdown(null);
  }

  async function callWord() {
    if (!session || calling) return;
    setCalling(true);
    try {
      const res = await fetch("/api/bingo/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id }),
      });
      if (res.ok) {
        const data = await res.json() as { word: string; call_order: number; remaining: number };
        setSession(prev => prev ? {
          ...prev,
          called_words: [...prev.called_words, { word: data.word, call_order: data.call_order }],
        } : prev);
        startCountdown(callInterval);
      }
    } finally { setCalling(false); }
  }

  async function endGame() {
    if (!session) return;
    await fetch("/api/bingo/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.id, action: "finish" }),
    });
    setSession(null);
    setCountdown(null);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }

  const calledCount  = session?.called_words.length ?? 0;
  const totalWords   = session?.word_bank.length ?? wordBank.length;
  const lastWord     = session?.called_words[calledCount - 1]?.word ?? null;
  const allCalled    = calledCount >= totalWords;
  const readyForNext = countdown === 0 || countdown === null;
  const pendingClaims = claims.filter(c => !dismissed.has(c.id));

  return (
    <div className="space-y-5">
      {!session ? (
        /* ── No active game ── */
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Family Bingo — Host</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Word bank: <strong>{wordBank.length}</strong> words · Edit at <Link href="/games" className="underline">/games</Link>
            </p>
          </div>

          {/* Timer picker */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Call interval</p>
            <div className="flex gap-2 flex-wrap">
              {INTERVAL_OPTIONS.map(s => (
                <button key={s} onClick={() => setCallInterval(s)}
                  className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${callInterval === s ? "border-[#C99500]/50 bg-[#C99500]/10 text-[#C99500]" : "border-border text-muted-foreground hover:border-[#C99500]/30 hover:text-foreground"}`}>
                  {s}s
                </button>
              ))}
            </div>
          </div>

          <Button onClick={startGame}
            className="w-full gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
            <Play className="h-4 w-4" /> Start New Bingo Game
          </Button>
        </div>

      ) : (
        <>
          {/* ── Active game status bar ── */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-foreground">
                Game Active · {calledCount}/{totalWords} called
              </span>
            </div>
            <button onClick={endGame}
              className="text-xs text-muted-foreground hover:text-[#B84A28] transition-colors flex items-center gap-1">
              <X className="h-3 w-3" /> End Game
            </button>
          </div>

          {/* ── Current word display ── */}
          <div className="rounded-2xl border-2 border-[#C99500]/40 bg-gradient-to-br from-[#3D1204] to-[#2E1503] p-6 text-center">
            {lastWord ? (
              <>
                <p className="text-xs uppercase tracking-widest text-[#A07035] mb-3">Current Word</p>
                <p className="text-4xl md:text-5xl font-black text-[#C99500] leading-tight">{lastWord}</p>
                {countdown !== null && countdown > 0 && (
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[#A07035]">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-sm">{countdown}s</span>
                  </div>
                )}
                {countdown === 0 && (
                  <p className="mt-3 text-xs text-green-400 animate-pulse">Ready for next word</p>
                )}
              </>
            ) : (
              <p className="text-[#A07035] text-lg">Press &ldquo;Call Word&rdquo; to begin!</p>
            )}
          </div>

          {/* ── Call button ── */}
          <Button
            onClick={callWord}
            disabled={calling || allCalled}
            className={`w-full gap-2 text-base h-12 transition-all ${readyForNext && lastWord ? "bg-green-600 hover:bg-green-500 text-white ring-2 ring-green-400/50" : "bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]"}`}
          >
            <Megaphone className="h-5 w-5" />
            {allCalled ? "All words called!" : calling ? "Calling…" : "Call Next Word"}
          </Button>

          {/* ── Called words log ── */}
          {calledCount > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Called Words ({calledCount})</p>
              <div className="flex flex-wrap gap-1.5">
                {[...session.called_words].reverse().map(cw => (
                  <span key={cw.call_order}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground">
                    {cw.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── BINGO claims ── */}
          {pendingClaims.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">BINGO Claims</p>
              {pendingClaims.map(claim => (
                <div key={claim.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${claim.is_valid ? "border-green-400/30 bg-green-400/10" : "border-red-400/30 bg-red-400/10"}`}>
                  {claim.is_valid
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    : <XCircle className="h-5 w-5 text-red-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{claim.player_name}</p>
                    <p className={`text-xs ${claim.is_valid ? "text-green-600" : "text-red-400"}`}>
                      {claim.is_valid ? "✅ Valid BINGO!" : "❌ Invalid — not a winning line"}
                    </p>
                  </div>
                  <button onClick={() => setDismissed(prev => new Set([...prev, claim.id]))}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIVIA HOST PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function TriviaHostPanel() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>(TRIVIA_QUESTIONS);
  const [bankOpen, setBankOpen]   = useState(false);
  const [newQ, setNewQ]           = useState({ ...BLANK_Q });
  const [addOpen, setAddOpen]     = useState(false);
  const [session, setSession]     = useState<TriviaSession | null>(null);
  const [answers, setAnswers]     = useState<AnswerRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [players, setPlayers]     = useState<PlayerRow[]>([]);
  const [loading, setLoading]     = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_TRIVIA_Q);
      if (saved) { const p = JSON.parse(saved) as TriviaQuestion[]; if (p.length > 0) setQuestions(p); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { localStorage.setItem(LS_TRIVIA_Q, JSON.stringify(questions)); }, [questions]);

  useEffect(() => {
    fetchSession();
    pollRef.current = setInterval(fetchSession, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSession() {
    const res = await fetch("/api/trivia/session");
    if (!res.ok) return;
    const data = await res.json() as { session: TriviaSession | null };
    if (!data.session) { setSession(null); return; }
    const s = data.session;
    setSession(s);
    if (s.status === "waiting") fetchPlayers(s.id);
    if (s.status === "question" || s.status === "reveal") fetchAnswers(s.id, s.current_question);
    if (s.status === "reveal" || s.status === "finished") fetchLeaderboard(s.id);
  }

  async function fetchPlayers(id: number) {
    const r = await fetch(`/api/trivia/players?session_id=${id}`);
    if (r.ok) { const d = await r.json() as { players: PlayerRow[] }; setPlayers(d.players); }
  }
  async function fetchAnswers(id: number, q: number) {
    const r = await fetch(`/api/trivia/answer?session_id=${id}&q=${q}`);
    if (r.ok) { const d = await r.json() as { answers: AnswerRow[] }; setAnswers(d.answers); }
  }
  async function fetchLeaderboard(id: number) {
    const r = await fetch(`/api/trivia/leaderboard?session_id=${id}`);
    if (r.ok) { const d = await r.json() as { leaderboard: LeaderboardEntry[] }; setLeaderboard(d.leaderboard); }
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
    setLoading(true); setAnswers([]); setLeaderboard([]); setPlayers([]);
    await fetch("/api/trivia/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    await fetchSession();
    setLoading(false);
  }

  function addQuestion() {
    const q = newQ.question.trim();
    const opts = newQ.options.map(o => o.trim()) as [string,string,string,string];
    if (!q || opts.some(o => !o)) return;
    setQuestions(prev => [...prev, { ...newQ, question: q, options: opts, answer: newQ.answer as TriviaQuestion["answer"] }]);
    setNewQ({ ...BLANK_Q }); setAddOpen(false);
  }

  const answerTally: Record<string,number> = { A:0,B:0,C:0,D:0 };
  for (const a of answers) answerTally[a.answer] = (answerTally[a.answer] ?? 0) + 1;
  const totalAnswers = answers.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Family Trivia — Host</h2>
          <p className="text-sm text-muted-foreground">Players join at <strong>/games/trivia</strong></p>
        </div>
        {!session && (
          <Button onClick={newSession} disabled={loading || questions.length === 0}
            className="gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
            <Play className="h-4 w-4" /> Start Game
          </Button>
        )}
      </div>

      {session && (
        <>
          {/* Status bar */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${session.status === "question" ? "bg-green-500 animate-pulse" : session.status === "reveal" ? "bg-[#C99500]" : session.status === "finished" ? "bg-rose-500" : "bg-zinc-500"}`} />
              <span className="text-sm font-medium capitalize">{session.status}</span>
              {session.status !== "waiting" && session.status !== "finished" && (
                <span className="text-xs text-muted-foreground">Q{session.current_question + 1}/{session.total_questions}</span>
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
              <Button onClick={() => doAction("reveal")} disabled={loading}
                className="gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
                <Eye className="h-4 w-4" /> Reveal Answer
              </Button>
            )}
            {session.status === "reveal" && (
              <Button onClick={() => doAction("next")} disabled={loading}
                className="gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
                <SkipForward className="h-4 w-4" />
                {session.current_question + 1 >= session.total_questions ? "Finish Game" : "Next Question"}
              </Button>
            )}
            {session.status === "finished" && (
              <Button onClick={newSession} disabled={loading}
                className="gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
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
                  const pct   = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
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

          {/* Waiting lobby */}
          {session.status === "waiting" && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#C99500]" />
                  <h3 className="text-sm font-semibold">Players Joined</h3>
                </div>
                <span className="text-2xl font-black text-[#C99500]">{players.length}</span>
              </div>
              {players.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Waiting for players to join…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {players.map(p => (
                    <span key={p.player_name} className="rounded-full border border-[#C99500]/30 bg-[#C99500]/10 px-3 py-1 text-sm font-medium">
                      {p.player_name}
                    </span>
                  ))}
                </div>
              )}
              <Button onClick={() => doAction("start")} disabled={loading || players.length === 0}
                className="w-full gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4] disabled:opacity-40">
                <Play className="h-4 w-4" />
                {players.length === 0 ? "Waiting for players…" : `Start Game · ${players.length} player${players.length !== 1 ? "s" : ""}`}
              </Button>
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
                {leaderboard.map((e, i) => (
                  <div key={e.name} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
                    <span className="w-6 text-center text-sm font-bold text-muted-foreground">#{i+1}</span>
                    <span className="flex-1 text-sm font-medium">{e.name}</span>
                    <span className="text-sm font-bold text-[#C99500]">{e.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Question bank */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 cursor-pointer" onClick={() => setBankOpen(v => !v)}>
            <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Question Bank</h2>
            <p className="text-xs text-muted-foreground">{questions.length} questions · shuffled each game</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setQuestions(TRIVIA_QUESTIONS)}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-[#C99500]/40 hover:text-foreground transition-colors">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            <button onClick={() => setBankOpen(v => !v)} className="text-muted-foreground">
              {bankOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {bankOpen && (
          <div className="space-y-3">
            <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {questions.map((q, i) => (
                <div key={i} className="flex items-start gap-3 bg-background px-3 py-2.5">
                  <span className="mt-0.5 min-w-[1.25rem] text-xs font-bold text-muted-foreground">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{q.question}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {q.options.map((o, oi) => (
                        <span key={oi} className={`mr-2 ${OPTION_LABELS[oi] === q.answer ? "font-semibold text-green-600" : ""}`}>
                          {OPTION_LABELS[oi]}: {o}
                        </span>
                      ))}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60">{q.category}</span>
                  </div>
                  <button onClick={() => setQuestions(prev => prev.filter((_, idx) => idx !== i))}
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-[#B84A28] transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => setAddOpen(v => !v)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:border-[#C99500]/40 hover:text-foreground transition-colors">
              <Plus className="h-4 w-4" /> Add Question
            </button>

            {addOpen && (
              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                <input type="text" placeholder="Question text…" value={newQ.question}
                  onChange={e => setNewQ(v => ({ ...v, question: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-[#C99500]/60 focus:outline-none focus:ring-2 focus:ring-[#C99500]/20 transition-colors" />
                <div className="grid grid-cols-2 gap-2">
                  {OPTION_LABELS.map((label, i) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${OPTION_BG[i]}`}>{label}</span>
                      <input type="text" placeholder={`Option ${label}…`} value={newQ.options[i]}
                        onChange={e => { const o = [...newQ.options] as [string,string,string,string]; o[i] = e.target.value; setNewQ(v => ({ ...v, options: o })); }}
                        className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-sm focus:border-[#C99500]/60 focus:outline-none focus:ring-1 focus:ring-[#C99500]/20 transition-colors" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Correct:</label>
                    <select value={newQ.answer} onChange={e => setNewQ(v => ({ ...v, answer: e.target.value }))}
                      className="h-8 rounded-lg border border-border bg-card px-2 text-sm focus:outline-none">
                      {OPTION_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <input type="text" placeholder="Category…" value={newQ.category}
                    onChange={e => setNewQ(v => ({ ...v, category: e.target.value }))}
                    className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-sm focus:border-[#C99500]/60 focus:outline-none focus:ring-1 focus:ring-[#C99500]/20 transition-colors" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={addQuestion} size="sm"
                    className="gap-1.5 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setAddOpen(false); setNewQ({ ...BLANK_Q }); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
