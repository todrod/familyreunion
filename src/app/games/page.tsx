"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shuffle, Printer, FileDown, X, Plus, RotateCcw, HelpCircle, CheckCircle2, XCircle } from "lucide-react";
import QRCode from "react-qr-code";
import { SiteNav } from "@/components/site-nav";

interface BingoSession {
  id: number;
  status: "active" | "finished";
  started: boolean;
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
  // Family surnames
  "DiMola",
  "Aversa",
  "Davino",
  "D'Ascola",
  "Iannone",
  "Mazzola",
  "Trezza",
  "Hodges",
  "Cookes",
  "Emprin",
  "Latham",
  // First names
  "Antoinette",
  "Anna",
  "Camilla",
  "Rocco",
  "Vincent",
  "Sonny",
  "Albert",
  "Alfonso",
  "Umberto",
  "Felix",
  "Carol",
  "Diane",
  "Tom",
  "Rocky",
  "Susie",
  "Carmen",
  "Bill",
  // Places
  "Brooklyn",
  "Sheepshead Bay",
  "Poconos",
  "Canary Islands",
  "New Bern",
  "California",
  "Florida",
  "New York",
  "New Jersey",
  "Nevada",
  "North Carolina",
  "South Carolina",
  "Maryland",
  "Banner Avenue",
  "Hampstead",
  "Reunion",
  // Food & traditions
  "Pasta",
  "Strufoli",
  "Apple Fritters",
  "Meatballs",
  "Cannoli",
  "Biscotti",
  "Sunday Gravy",
  "Espresso",
  "Garlic Bread",
  "Family Recipe",
  "Sunday Dinner",
  // Family lore
  "Card Games",
  "Haircuts",
  "Piano",
  "Pharmacist",
  // Italian words & greetings
  "Ciao",
  "Buongiorno",
  "Buonasera",
  "Arrivederci",
  "Grazie",
  "Prego",
  "Famiglia",
  "Nonna",
  "Nonno",
  "Zio",
  "Zia",
  "Nipote",
  "Amore",
  "Bello",
  "Bella",
  "Mangia!",
  "Salute!",
  "Cin Cin!",
  "Benvenuti",
  "Casa",
  "Cucina",
  "Festa",
  "Paesano",
  "Compare",
  "Comare",
  // Reunion moments
  "Loud Table",
  "Family Story",
  "Old Photo",
  "Cousin",
  "Grandchild",
  "Great Grandchild",
  "Vacation Story",
  "Wedding Story",
  "Card Shark",
  "Lucky Winner",
  "Group Photo",
  "Hug",
  "Laughter",
  "Dance Floor",
  "Family Tree",
  "Name Tag",
  "Raffle",
  "Trivia",
  "Dessert Table",
  // More food
  "Secret Recipe",
  "Sunday Sauce",
  "Homemade Wine",
  "Fresh Mozzarella",
  "Sausage & Peppers",
  "Italian Bread",
  "Ricotta",
  "Parmesan",
  "Lasagna",
  "Ravioli",
  "Manicotti",
  "Cappuccino",
  "Gelato",
  "Olive Oil",
  // Activities
  "Bocce",
  "Tarantella",
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
  const [pageUrl, setPageUrl] = useState("");
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
  const registeredBingo = useRef<number>(-1);

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

  // Register into the lobby once we have a session and a name
  useEffect(() => {
    if (!bingoSession || !playerName) return;
    if (registeredBingo.current === bingoSession.id) return;
    registeredBingo.current = bingoSession.id;
    fetch("/api/bingo/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: bingoSession.id, player_name: playerName }),
    }).catch(() => { /* ignore */ });
  }, [bingoSession, playerName]);

  // Live = a game exists AND the host has started it (vs. still in the lobby)
  const live = !!bingoSession?.started;

  function daub(idx: number) {
    if (idx === 12) return; // FREE space
    if (!live) return;
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

  function joinBingo() {
    const n = nameInput.trim();
    if (!n) return;
    localStorage.setItem("reunion_bingo_name", n);
    setPlayerName(n);
    setNameInput("");
  }

  const lastCalledWord = bingoSession?.called_words[bingoSession.called_words.length - 1]?.word ?? null;

  useEffect(() => {
    setPageUrl(window.location.origin + "/games");
  }, []);

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

  // Generate a crisp, printable PDF of the current card (vector text, no screenshot).
  async function downloadPdf() {
    if (card.length < 25) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const margin = 54;
    const gw = W - margin * 2;
    const cell = gw / 5;

    const GREEN = "#14321f", GOLD = "#c28e2b", TAN = "#b39357", INK = "#14321f", LINE = "#c9b48a";

    // Header band
    let y = margin;
    const bandH = 76;
    doc.setFillColor(GREEN);
    doc.roundedRect(margin, y, gw, bandH, 8, 8, "F");
    doc.setTextColor(TAN);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("14TH AVERSA FAMILY REUNION  ·  JULY 2026", W / 2, y + 22, { align: "center" });
    doc.setTextColor(GOLD);
    doc.setFont("times", "bold");
    doc.setFontSize(42);
    doc.text("B I N G O", W / 2, y + 56, { align: "center" });
    doc.setTextColor(TAN);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Card #${cardNum}`, W / 2, y + 70, { align: "center" });
    y += bandH + 10;

    // Column headers
    const colH = 28;
    doc.setFillColor("#f5ead0");
    doc.rect(margin, y, gw, colH, "F");
    doc.setTextColor(GOLD);
    doc.setFont("times", "bold");
    doc.setFontSize(17);
    ["B", "I", "N", "G", "O"].forEach((h, c) =>
      doc.text(h, margin + cell * c + cell / 2, y + 19, { align: "center" })
    );
    y += colH;

    // Grid
    const gridTop = y;
    doc.setLineWidth(0.8);
    doc.setDrawColor(LINE);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const x = margin + c * cell;
        const cy = gridTop + r * cell;
        const word = card[r * 5 + c];
        if (word === "FREE") {
          doc.setFillColor(GREEN);
          doc.rect(x, cy, cell, cell, "FD");
          doc.setTextColor(GOLD);
          doc.setFont("times", "bold");
          doc.setFontSize(12);
          doc.text("FREE", x + cell / 2, cy + cell / 2 - 1, { align: "center" });
          doc.setTextColor(TAN);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.text("SPACE", x + cell / 2, cy + cell / 2 + 11, { align: "center" });
        } else {
          doc.setFillColor("#ffffff");
          doc.rect(x, cy, cell, cell, "FD");
          doc.setTextColor(INK);
          doc.setFont("helvetica", "normal");
          let fs = 11;
          doc.setFontSize(fs);
          let lines = doc.splitTextToSize(word, cell - 12) as string[];
          while (lines.length > 3 && fs > 7) {
            fs -= 1;
            doc.setFontSize(fs);
            lines = doc.splitTextToSize(word, cell - 12) as string[];
          }
          const lineH = fs * 1.18;
          let ty = cy + cell / 2 - (lines.length * lineH) / 2 + fs * 0.9;
          for (const ln of lines) {
            doc.text(ln, x + cell / 2, ty, { align: "center" });
            ty += lineH;
          }
        }
      }
    }

    // Footer
    doc.setTextColor(TAN);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Aversa Family Reunion · Family Bingo", W / 2, gridTop + 5 * cell + 22, { align: "center" });

    doc.save(`Aversa-Bingo-Card-${cardNum}.pdf`);
  }

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
            <div className="rounded-xl border-2 border-[#c28e2b]/40 bg-[#c28e2b]/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#c28e2b]">Playing now</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">Family Bingo</p>
              <p className="text-xs text-muted-foreground">Generate & print cards</p>
            </div>
            <Link href="/games/trivia" className="rounded-xl border border-border bg-card px-4 py-3 hover:border-[#c28e2b]/30 hover:bg-[#c28e2b]/5 transition-colors">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live game</p>
              </div>
              <p className="mt-0.5 text-sm font-medium text-foreground">Family Trivia</p>
              <p className="text-xs text-muted-foreground">Live quiz — join any device</p>
            </Link>
          </div>

          {/* Page header */}
          <div className={`no-print flex items-start justify-between ${live ? "hidden" : ""}`}>
            <div>
              <h1 className="text-2xl text-foreground" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>Family Bingo</h1>
              <p className="text-sm text-muted-foreground">Every card is unique — edit the word bank, generate, then print.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={newCard} disabled={tooFew} className="gap-1.5 text-sm">
                <Shuffle className="h-4 w-4" /> New Card
              </Button>
              <Button variant="outline" onClick={downloadPdf} disabled={tooFew} className="gap-1.5 text-sm">
                <FileDown className="h-4 w-4" /> Save PDF
              </Button>
              <Button onClick={() => window.print()} disabled={tooFew}
                className="gap-1.5 bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2] text-sm">
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
          </div>

          {/* ── Join prompt (need a name to play) ── */}
          {bingoSession && !playerName && (
            <div className="no-print rounded-2xl border-2 border-[#c28e2b]/50 bg-card p-5 space-y-4">
              <div className="text-center">
                <p className="text-xl font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Join Family Bingo</p>
                <p className="text-sm text-muted-foreground mt-0.5">Enter your name so the host can see you and verify your BINGO.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && nameInput.trim()) joinBingo(); }}
                  placeholder="Your name…"
                  className="h-14 flex-1 rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-2 focus:ring-[#c28e2b]/20 transition-colors"
                  autoFocus />
                <Button onClick={joinBingo} disabled={!nameInput.trim()}
                  className="h-14 rounded-xl px-8 text-base font-semibold bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2]">Join</Button>
              </div>
              {pageUrl && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <div className="shrink-0 rounded-lg bg-white p-1.5">
                    <QRCode value={pageUrl} size={60} bgColor="#ffffff" fgColor="#14321f" />
                  </div>
                  <p className="text-xs text-muted-foreground">Others can <strong>scan to pull up a bingo card</strong> on their own phone.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Lobby (joined, waiting for host to start) ── */}
          {bingoSession && playerName && !live && (
            <div className="no-print rounded-2xl border-2 border-[#c28e2b]/50 bg-[#c28e2b]/5 p-5 text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-base font-semibold text-foreground">You&apos;re in, {playerName}! 🎉</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Waiting for the host to start the game. Tap <strong>New Card</strong> above to shuffle the card you&apos;ll play with.
              </p>
            </div>
          )}

          {/* ── Live game banner ── */}
          {live && (
            <div className="no-print rounded-2xl border-2 border-[#c28e2b]/50 bg-[#c28e2b]/5 p-4 space-y-3">
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
                  <p className={`text-2xl font-black ${calledWords.has(lastCalledWord) ? "text-[#c28e2b]" : "text-foreground"}`}>{lastCalledWord}</p>
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
            <div className="no-print rounded-xl border border-[#bf5a33]/30 bg-[#bf5a33]/10 px-4 py-3 text-sm text-[#bf5a33]">
              Add at least <strong>{24 - words.length} more word{24 - words.length !== 1 ? "s" : ""}</strong> to the bank before generating a card.
            </div>
          )}

          {/* Bingo card */}
          <div className="print-card">
            <div className="bingo-grid w-full overflow-hidden rounded-2xl border-2 border-[#c28e2b]/40 bg-card shadow-xl">
              <div className="bg-gradient-to-r from-[#1d4d33] to-[#14321f] px-4 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#b39357]">14th Aversa Family Reunion · July 2026</p>
                <h2 className="mt-0.5 text-5xl font-black tracking-[0.45em] text-[#c28e2b]" style={{ fontFamily: "var(--font-playfair)" }}>BINGO</h2>
                <p className="mt-1 text-[10px] text-[#7a6a4a]">Card #{cardNum}</p>
              </div>
              <div className="grid grid-cols-5 border-b-2 border-[#c28e2b]/30">
                {HEADERS.map((h) => (
                  <div key={h} className="bg-[#c28e2b]/10 py-2 text-center text-xl font-black text-[#c28e2b]">{h}</div>
                ))}
              </div>
              <div className="grid grid-cols-5">
                {card.map((cell, i) => {
                  const row = Math.floor(i / 5);
                  const col = i % 5;
                  const isFree = cell === "FREE";
                  const isCalled = live && !isFree && calledWords.has(cell);
                  const isDaubed = daubed.has(i);

                  let cellBg = isFree ? "bg-gradient-to-br from-[#1d4d33] to-[#14321f]" : "bg-card";
                  let cellExtra = "";
                  let cellClick: (() => void) | undefined;

                  if (live && !isFree) {
                    if (isDaubed) {
                      cellBg = "bg-[#c28e2b]";
                      cellClick = () => daub(i);
                    } else if (isCalled) {
                      cellBg = "bg-[#c28e2b]/10";
                      cellExtra = "ring-2 ring-[#c28e2b] cursor-pointer hover:bg-[#c28e2b]/20";
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
                          <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[#c28e2b]/40">
                            <Image src="/family-tree-photo.jpeg" alt="Aversa family tree" width={56} height={56} style={{ width: "56px", height: "56px", objectFit: "cover" }} />
                          </div>
                          <span className="text-[9px] uppercase tracking-widest text-[#b39357]">Free Space</span>
                        </div>
                      ) : isDaubed ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-bold leading-tight text-[#14321f]">{cell}</span>
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
          {live && (
            <div className="no-print space-y-3">
              {claimStatus === null && hasBingo && (
                <Button onClick={claimBingo}
                  className="w-full h-14 text-xl font-black gap-2 bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2] animate-pulse">
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
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-2 focus:ring-[#c28e2b]/20 transition-colors"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={saveName} disabled={!nameInput.trim()}
                    className="flex-1 bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2]">
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
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-[#c28e2b]/40 hover:text-foreground transition-colors">
                <RotateCcw className="h-3 w-3" /> Reset to defaults
              </button>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {words.map((w) => (
                <span key={w} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm">
                  {w}
                  <button onClick={() => removeWord(w)}
                    className="text-muted-foreground hover:text-[#bf5a33] transition-colors"
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
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-2 focus:ring-[#c28e2b]/20 transition-colors"
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
