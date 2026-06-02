"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shuffle, Printer, X, Plus, RotateCcw, HelpCircle, CheckCircle2, XCircle } from "lucide-react";
import { SiteNav } from "@/components/site-nav";

interface BingoSession {
  id: number;
  status: "active" | "finished";
  call_interval_seconds: number;
  word_bank: string[];
  called_words: { word: string; call_order: number }[];
}

const WIN_LINES = [
  [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
  [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
  [0,6,12,18,24],[4,8,12,16,20],
] as const;

const LS_KEY = "reunion_bingo_words";

const DEFAULT_WORDS = [
  // Family names
  "Aversa",
  "The Cousins",
  "The Aunts",
  "The Uncles",
  "Grandma's Recipe",
  "The Baby",
  "The Newlyweds",
  "Long Lost Cousin",
  "Family Historian",
  "The Organizer",
  "The Kids Table",
  "Uncle with Stories",
  "Matching Outfits",
  "The Early Bird",
  "The Night Owl",
  // Reunion moments
  "Group Photo",
  "Selfie Time",
  "Happy Tears",
  "Big Hugs",
  "Remember When",
  "Old Photos",
  "First to Pool",
  "Last to Bed",
  "Baby Photos",
  "Best Dancer",
  "Nap After Brunch",
  "Double Seconds",
  "Loud Laughing",
  "Same Story Again",
  "Lost Hotel Key",
  "Wrong Room Floor",
  "Elevator Wait",
  "WiFi Password",
  // Hotel & location
  "Hampton Inn",
  "Old Bridge NJ",
  "Indoor Pool",
  "Hot Breakfast",
  "Jersey Shore",
  "Lobby Hangout",
  "Room Service",
  "Pool Float",
  // Activities
  "Welcome Toast",
  "Farewell Brunch",
  "Late Night Chat",
  "Breakfast Table",
  "Pool Cannonball",
  "Family Trivia",
  "Card Game",
  "Photo Slideshow",
  "Dance Circle",
  // Themes
  "14th Reunion",
  "Summer 2026",
  "Family Roots",
  "New Faces",
  "Old Friends",
  "Jersey Pride",
  "Memory Lane",
  "Road Trip Story",
  "Keep in Touch",
  "Family Tree",
  "All Together",
  "Next Reunion",
];

const HEADERS = ["B", "I", "N", "G", "O"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCard(words: string[]): string[] {
  const picked = shuffle(words).slice(0, 24);
  return [...picked.slice(0, 12), "FREE", ...picked.slice(12)];
}

export default function BingoPage() {
  const [words, setWords] = useState<string[]>(DEFAULT_WORDS);
  const [card, setCard] = useState<string[]>([]);
  const [cardNum, setCardNum] = useState(1);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Live game state ────────────────────────────────────────────
  const [bingoSession, setBingoSession] = useState<BingoSession | null>(null);
  const [calledWords, setCalledWords]   = useState<Set<string>>(new Set());
  const [daubed, setDaubed]             = useState<Set<number>>(new Set([12]));
  const [playerName, setPlayerName]     = useState("");
  const [nameInput, setNameInput]       = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [claimStatus, setClaimStatus]   = useState<null | "pending" | "valid" | "invalid">(null);
  const prevSessionId = useRef<number>(-1);

  // Load bingo player name
  useEffect(() => {
    const saved = localStorage.getItem("reunion_bingo_name");
    if (saved) setPlayerName(saved);
  }, []);

  // Poll bingo session
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/bingo/session");
        if (!res.ok) return;
        const data = await res.json() as { session: BingoSession | null };
        if (!data.session) { setBingoSession(null); setCalledWords(new Set()); return; }
        const s = data.session;
        if (s.id !== prevSessionId.current) {
          prevSessionId.current = s.id;
          // Restore or reset daubed state for this session
          try {
            const saved = localStorage.getItem(`reunion_bingo_daubed_${s.id}`);
            const savedSet = saved ? new Set(JSON.parse(saved) as number[]) : new Set<number>();
            savedSet.add(12); // FREE space always daubed
            setDaubed(savedSet);
          } catch { setDaubed(new Set([12])); }
          setClaimStatus(null);
        }
        setBingoSession(s);
        setCalledWords(new Set(s.called_words.map(cw => cw.word)));
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  // Persist daubed state
  useEffect(() => {
    if (bingoSession) {
      localStorage.setItem(`reunion_bingo_daubed_${bingoSession.id}`, JSON.stringify([...daubed]));
    }
  }, [daubed, bingoSession]);

  function daub(idx: number) {
    if (idx === 12) return; // FREE space
    if (!bingoSession) return;
    if (!calledWords.has(card[idx])) return; // only daub called words
    setDaubed(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  const hasBingo = WIN_LINES.some(line =>
    line.every(i => i === 12 || (daubed.has(i) && calledWords.has(card[i])))
  );

  async function claimBingo() {
    if (!playerName) { setShowNamePrompt(true); return; }
    await submitClaim(playerName);
  }

  async function submitClaim(name: string) {
    if (!bingoSession) return;
    setClaimStatus("pending");
    const res = await fetch("/api/bingo/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: bingoSession.id,
        player_name: name,
        card_words: card,
        marked_indices: [...daubed],
      }),
    });
    const data = await res.json() as { is_valid: boolean };
    setClaimStatus(data.is_valid ? "valid" : "invalid");
  }

  function saveName() {
    const n = nameInput.trim();
    if (!n) return;
    localStorage.setItem("reunion_bingo_name", n);
    setPlayerName(n);
    setShowNamePrompt(false);
    submitClaim(n);
  }

  const lastCalledWord = bingoSession?.called_words[bingoSession.called_words.length - 1]?.word ?? null;

  // Load saved words from localStorage on mount and generate card client-side
  useEffect(() => {
    let wordList = DEFAULT_WORDS;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          wordList = parsed;
          setWords(parsed);
        }
      }
    } catch { /* ignore */ }
    setCard(generateCard(wordList));
  }, []);

  // Persist words whenever they change
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(words));
  }, [words]);

  const newCard = useCallback(() => {
    setCard(generateCard(words));
    setCardNum((n) => n + 1);
  }, [words]);

  function addWord() {
    const trimmed = input.trim().replace(/,+$/, "");
    if (!trimmed || words.includes(trimmed)) { setInput(""); return; }
    const next = [...words, trimmed];
    setWords(next);
    setInput("");
    inputRef.current?.focus();
  }

  function removeWord(w: string) {
    setWords((prev) => prev.filter((x) => x !== w));
  }

  function resetWords() {
    setWords(DEFAULT_WORDS);
  }

  const tooFew = words.length < 24;

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-card { position: fixed; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 16px; }
          .bingo-grid { width: 100%; max-width: 680px; }
        }
      `}</style>

      <div className="min-h-screen bg-background">

        <SiteNav noPrint />

        <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">

          {/* Game picker */}
          <div className={`no-print grid grid-cols-2 gap-3 ${bingoSession ? "hidden" : ""}`}>
            <div className="rounded-xl border-2 border-[#C99500]/40 bg-[#C99500]/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#C99500]">Playing now</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">Family Bingo</p>
              <p className="text-xs text-muted-foreground">Generate & print cards</p>
            </div>
            <Link href="/games/trivia" className="rounded-xl border border-border bg-card px-4 py-3 hover:border-[#C99500]/30 hover:bg-[#C99500]/5 transition-colors">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live game</p>
              </div>
              <p className="mt-0.5 text-sm font-medium text-foreground">Family Trivia</p>
              <p className="text-xs text-muted-foreground">Live quiz — join any device</p>
            </Link>
          </div>

          {/* Page header */}
          <div className={`no-print flex items-start justify-between ${bingoSession ? "hidden" : ""}`}>
            <div>
              <h1 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>Family Bingo</h1>
              <p className="text-sm text-muted-foreground">Every card is unique — edit the word bank, generate, then print.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={newCard} disabled={tooFew} className="gap-1.5 text-sm">
                <Shuffle className="h-4 w-4" /> New Card
              </Button>
              <Button onClick={() => window.print()} disabled={tooFew}
                className="gap-1.5 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4] text-sm">
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          </div>

          {/* ── Live game banner ── */}
          {bingoSession && (
            <div className="no-print rounded-2xl border-2 border-[#C99500]/50 bg-[#C99500]/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-semibold text-foreground">Game in Progress</span>
                </div>
                <span className="text-xs text-muted-foreground">{calledWords.size} of {bingoSession.word_bank.length} called</span>
              </div>
              {lastCalledWord ? (
                <div className="text-center py-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Last Called</p>
                  <p className={`text-2xl font-black ${calledWords.has(lastCalledWord) ? "text-[#C99500]" : "text-foreground"}`}>{lastCalledWord}</p>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">Waiting for the host to call the first word…</p>
              )}
              <p className="text-center text-xs text-muted-foreground">
                {playerName ? `Playing as ${playerName}` : "Tap called words on your card to mark them"}
              </p>
            </div>
          )}

          {/* Too-few warning */}
          {tooFew && !bingoSession && (
            <div className="no-print rounded-xl border border-[#B84A28]/30 bg-[#B84A28]/10 px-4 py-3 text-sm text-[#B84A28]">
              Add at least <strong>{24 - words.length} more word{24 - words.length !== 1 ? "s" : ""}</strong> to the bank before generating a card.
            </div>
          )}

          {/* Bingo card */}
          <div className="print-card">
            <div className="bingo-grid w-full overflow-hidden rounded-2xl border-2 border-[#C99500]/40 bg-card shadow-xl">
              <div className="bg-gradient-to-r from-[#3D1204] to-[#2E1503] px-4 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#A07035]">14th Aversa Family Reunion · July 2026</p>
                <h2 className="mt-0.5 text-5xl font-black tracking-[0.45em] text-[#C99500]" style={{ fontFamily: "var(--font-playfair)" }}>BINGO</h2>
                <p className="mt-1 text-[10px] text-[#7A5030]">Card #{cardNum}</p>
              </div>
              <div className="grid grid-cols-5 border-b-2 border-[#C99500]/30">
                {HEADERS.map((h) => (
                  <div key={h} className="bg-[#C99500]/10 py-2 text-center text-xl font-black text-[#C99500]">{h}</div>
                ))}
              </div>
              <div className="grid grid-cols-5">
                {card.map((cell, i) => {
                  const row = Math.floor(i / 5);
                  const col = i % 5;
                  const isFree = cell === "FREE";
                  const isCalled = bingoSession && !isFree && calledWords.has(cell);
                  const isDaubed = daubed.has(i);

                  let cellBg = isFree ? "bg-gradient-to-br from-[#3D1204] to-[#2E1503]" : "bg-card";
                  let cellExtra = "";
                  let cellClick: (() => void) | undefined;

                  if (bingoSession && !isFree) {
                    if (isDaubed) {
                      cellBg = "bg-[#C99500]";
                      cellClick = () => daub(i);
                    } else if (isCalled) {
                      cellBg = "bg-[#C99500]/10";
                      cellExtra = "ring-2 ring-[#C99500] cursor-pointer hover:bg-[#C99500]/20";
                      cellClick = () => daub(i);
                    } else {
                      cellExtra = "opacity-40";
                    }
                  }

                  return (
                    <div key={i}
                      onClick={cellClick}
                      className={`relative flex min-h-[90px] items-center justify-center p-1.5 text-center select-none transition-colors
                        ${cellBg} ${cellExtra}
                        ${col < 4 ? "border-r border-border/40" : ""}
                        ${row < 4 ? "border-b border-border/40" : ""}`}
                    >
                      {isFree ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[#C99500]/40">
                            <Image src="/family-tree-photo.jpeg" alt="Aversa family tree" width={56} height={56} style={{ width: "56px", height: "56px", objectFit: "cover" }} />
                          </div>
                          <span className="text-[9px] uppercase tracking-widest text-[#A07035]">Free Space</span>
                        </div>
                      ) : isDaubed ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-bold leading-tight text-[#2E1503]">{cell}</span>
                          <span className="text-lg leading-none">✓</span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium leading-tight text-foreground">{cell}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── BINGO claim area ── */}
          {bingoSession && (
            <div className="no-print space-y-3">
              {claimStatus === null && hasBingo && (
                <Button onClick={claimBingo}
                  className="w-full h-14 text-xl font-black gap-2 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4] animate-pulse">
                  🎉 BINGO!
                </Button>
              )}
              {claimStatus === "pending" && (
                <div className="rounded-2xl border border-border bg-card p-4 text-center">
                  <p className="text-sm text-muted-foreground animate-pulse">Submitting claim…</p>
                </div>
              )}
              {claimStatus === "valid" && (
                <div className="rounded-2xl border border-green-400/30 bg-green-400/10 p-4 text-center space-y-1">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
                  <p className="text-base font-bold text-green-600">Valid BINGO! 🎉</p>
                  <p className="text-sm text-muted-foreground">The host has been notified.</p>
                </div>
              )}
              {claimStatus === "invalid" && (
                <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-center space-y-2">
                  <XCircle className="mx-auto h-8 w-8 text-red-400" />
                  <p className="text-base font-bold text-red-500">Not quite — keep going!</p>
                  <Button variant="outline" size="sm" onClick={() => setClaimStatus(null)}>Try Again</Button>
                </div>
              )}
              {!hasBingo && claimStatus === null && calledWords.size > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Tap called words (gold border) on your card to mark them · BINGO button appears when you have 5 in a row
                </p>
              )}
            </div>
          )}

          {/* ── Name prompt modal ── */}
          {showNamePrompt && (
            <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
              <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl">
                <div className="text-center">
                  <p className="text-lg font-semibold">What&apos;s your name?</p>
                  <p className="text-sm text-muted-foreground mt-1">So the host knows who called BINGO!</p>
                </div>
                <input type="text" value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && nameInput.trim()) saveName(); }}
                  placeholder="Your name…"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[#C99500]/60 focus:outline-none focus:ring-2 focus:ring-[#C99500]/20 transition-colors"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={saveName} disabled={!nameInput.trim()}
                    className="flex-1 bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4]">
                    Claim BINGO! 🎉
                  </Button>
                  <Button variant="outline" onClick={() => setShowNamePrompt(false)}>Cancel</Button>
                </div>
              </div>
            </div>
          )}

          {/* Word bank editor */}
          <div className="no-print rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Word Bank</h2>
                <p className="text-xs text-muted-foreground">{words.length} words · cards draw 24 at random</p>
              </div>
              <button onClick={resetWords}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-[#C99500]/40 hover:text-foreground transition-colors">
                <RotateCcw className="h-3 w-3" /> Reset to defaults
              </button>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {words.map((w) => (
                <span key={w} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm">
                  {w}
                  <button onClick={() => removeWord(w)}
                    className="text-muted-foreground hover:text-[#B84A28] transition-colors"
                    aria-label={`Remove ${w}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add word input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addWord(); } }}
                placeholder="Add a word or phrase and press Enter…"
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#C99500]/60 focus:outline-none focus:ring-2 focus:ring-[#C99500]/20 transition-colors"
              />
              <Button onClick={addWord} size="sm" variant="outline" className="gap-1.5 h-9">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Changes save automatically. Hit <strong>New Card</strong> to refresh the card with your updated word bank.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
