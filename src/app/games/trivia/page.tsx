"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Trophy, Users } from "lucide-react";
import QRCode from "react-qr-code";
import { SiteNav } from "@/components/site-nav";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const OPTION_COLORS = [
  "bg-blue-600 hover:bg-blue-500",
  "bg-amber-600 hover:bg-amber-500",
  "bg-green-700 hover:bg-green-600",
  "bg-rose-700 hover:bg-rose-600",
];
const OPTION_REVEAL_CORRECT = "bg-green-600 border-green-400 scale-[1.02]";
const OPTION_REVEAL_WRONG = "bg-zinc-700 border-zinc-600 opacity-50";

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

interface LeaderboardEntry { name: string; score: number; }

const LS_PLAYER = "reunion_trivia_player";

export default function TriviaPlayerPage() {
  const [playerName, setPlayerName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [session, setSession] = useState<SessionState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [pageUrl, setPageUrl] = useState("");
  const prevQIndex = useRef<number>(-1);
  const registeredSession = useRef<number>(-1);

  useEffect(() => {
    setPageUrl(window.location.origin + "/games/trivia");
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(LS_PLAYER);
    if (saved) setPlayerName(saved);
  }, []);

  // Poll session state
  useEffect(() => {
    if (!playerName) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/trivia/session");
        if (!res.ok) return;
        const data = await res.json() as { session: SessionState | null };
        if (!data.session) return;

        const s = data.session;

        // Reset answer state when question advances
        if (s.current_question !== prevQIndex.current) {
          setSelected(null);
          setSubmitted(false);
          prevQIndex.current = s.current_question;
        }

        setSession(s);

        // Register into waiting session once
        if (s.status === "waiting" && registeredSession.current !== s.id) {
          registeredSession.current = s.id;
          await fetch("/api/trivia/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: s.id, player_name: playerName }),
          });
        }

        // Fetch player count during waiting
        if (s.status === "waiting") {
          const pr = await fetch(`/api/trivia/players?session_id=${s.id}`);
          if (pr.ok) {
            const pd = await pr.json() as { players: { player_name: string }[] };
            setPlayerCount(pd.players.length);
          }
        }

        if (s.status === "finished" || s.status === "reveal") {
          fetchLeaderboard(s.id);
        }
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [playerName]);

  async function fetchLeaderboard(sessionId: number) {
    const res = await fetch(`/api/trivia/leaderboard?session_id=${sessionId}`);
    if (!res.ok) return;
    const data = await res.json() as { leaderboard: LeaderboardEntry[] };
    setLeaderboard(data.leaderboard);
  }

  async function submitAnswer(answer: string) {
    if (submitted || !session) return;
    setSelected(answer);
    setSubmitted(true);
    await fetch("/api/trivia/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.id, player_name: playerName, answer }),
    });
  }

  function joinGame() {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem(LS_PLAYER, name);
    setPlayerName(name);
  }

  const myRank = leaderboard.findIndex((e) => e.name === playerName) + 1;
  const myScore = leaderboard.find((e) => e.name === playerName)?.score ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="mx-auto max-w-lg px-4 py-8">

        {/* Name entry */}
        {!playerName ? (
          <div className="flex flex-col items-center gap-6 py-10">
            <div className="text-center">
              <h1 className="text-3xl text-foreground" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>Family Trivia</h1>
              <p className="mt-2 text-sm text-muted-foreground">A live quiz game — answer questions on your phone while the host runs it on a big screen.</p>
            </div>

            {/* QR code */}
            {pageUrl && (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <QRCode value={pageUrl} size={160} bgColor="transparent" fgColor="currentColor" className="text-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Scan to open on your phone</p>
              </div>
            )}

            <div className="w-full max-w-sm space-y-3">
              <p className="text-center text-sm text-muted-foreground">Enter your name below to join</p>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") joinGame(); }}
                placeholder="Your name…"
                className="h-11 w-full rounded-xl border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[#d4a853]/60 focus:outline-none focus:ring-2 focus:ring-[#d4a853]/20 transition-colors"
                autoFocus
              />
              <Button onClick={joinGame} className="h-11 w-full bg-[#d4a853] text-[#1c1208] hover:bg-[#c8553d] hover:text-[#f5ede0] text-base font-semibold">
                Join Game
              </Button>
            </div>
          </div>

        ) : !session ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/40 animate-pulse" />
            <p className="text-muted-foreground">Waiting for the host to start a game…</p>
            <p className="text-xs text-muted-foreground/60">
              Playing as <strong>{playerName}</strong> ·{" "}
              <button className="underline" onClick={() => { setPlayerName(""); setNameInput(""); }}>change name</button>
            </p>
          </div>

        ) : session.status === "waiting" ? (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d4a853]/10 border border-[#d4a853]/30">
              <Users className="h-7 w-7 text-[#d4a853]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>You&rsquo;re in!</h2>
              <p className="mt-1 text-muted-foreground text-sm">Waiting for the host to start…</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-6 py-4 text-center">
              <p className="text-3xl font-bold text-[#d4a853]">{playerCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">player{playerCount !== 1 ? "s" : ""} joined</p>
            </div>
            <p className="text-xs text-muted-foreground/60">
              Playing as <strong>{playerName}</strong> ·{" "}
              <button className="underline" onClick={() => { setPlayerName(""); setNameInput(""); localStorage.removeItem(LS_PLAYER); }}>change name</button>
            </p>
          </div>

        ) : session.status === "finished" ? (
          <div className="space-y-6 py-6">
            <div className="text-center">
              <Trophy className="mx-auto h-12 w-12 text-[#d4a853]" />
              <h2 className="mt-3 text-2xl" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>Game Over!</h2>
              {myRank > 0 && (
                <p className="mt-1 text-muted-foreground">
                  You scored <strong>{myScore}</strong> — #{myRank} out of {leaderboard.length}
                </p>
              )}
            </div>
            <Leaderboard entries={leaderboard} highlight={playerName} />
          </div>

        ) : session.question ? (
          <div className="space-y-5">
            {/* Progress */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="rounded-full border border-border px-2.5 py-1 text-[#d4a853]">{session.question.category}</span>
              <span>Question {session.current_question + 1} of {session.total_questions}</span>
            </div>

            {/* Question */}
            <div className="rounded-2xl border border-border bg-card px-5 py-6">
              <p className="text-lg font-semibold leading-snug text-foreground">{session.question.question}</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {session.question.options.map((opt, i) => {
                const label = OPTION_LABELS[i];
                const isSelected = selected === label;
                const isReveal = session.status === "reveal";
                const correctAnswer = session.question?.answer;
                const isCorrect = isReveal && label === correctAnswer;
                const isWrong = isReveal && isSelected && label !== correctAnswer;

                let cls = "relative flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-medium text-white transition-all ";
                if (isReveal) {
                  cls += isCorrect ? OPTION_REVEAL_CORRECT + " border-green-400 " : OPTION_REVEAL_WRONG + " border-transparent ";
                } else if (isSelected) {
                  cls += "bg-[#d4a853] border-[#d4a853] text-[#1c1208] ";
                } else if (submitted) {
                  cls += "bg-zinc-800 border-transparent opacity-60 cursor-not-allowed ";
                } else {
                  cls += OPTION_COLORS[i] + " border-transparent cursor-pointer ";
                }

                return (
                  <button
                    key={label}
                    className={cls}
                    onClick={() => !submitted && !isReveal && submitAnswer(label)}
                    disabled={submitted || isReveal}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">{label}</span>
                    <span className="flex-1">{opt}</span>
                    {isReveal && isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-white" />}
                    {isWrong && <XCircle className="h-5 w-5 shrink-0 text-white/70" />}
                  </button>
                );
              })}
            </div>

            {submitted && session.status === "question" && (
              <p className="text-center text-sm text-muted-foreground animate-pulse">Answer locked in — waiting for reveal…</p>
            )}

            {session.status === "reveal" && leaderboard.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scores so far</p>
                <Leaderboard entries={leaderboard.slice(0, 5)} highlight={playerName} compact />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Leaderboard({ entries, highlight, compact }: { entries: LeaderboardEntry[]; highlight: string; compact?: boolean }) {
  if (entries.length === 0) return null;
  return (
    <div className={`space-y-2 ${compact ? "" : "rounded-2xl border border-border bg-card p-5"}`}>
      {!compact && <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Leaderboard</h3>}
      {entries.map((entry, i) => (
        <div key={entry.name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${entry.name === highlight ? "bg-[#d4a853]/15 border border-[#d4a853]/30" : "bg-muted/40"}`}>
          <span className="w-6 text-center text-sm font-bold text-muted-foreground">#{i + 1}</span>
          <span className="flex-1 text-sm font-medium text-foreground">{entry.name}</span>
          <span className="text-sm font-bold text-[#d4a853]">{entry.score}</span>
        </div>
      ))}
    </div>
  );
}
