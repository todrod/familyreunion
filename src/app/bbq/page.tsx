"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SiteNav } from "@/components/site-nav";
import {
  Flame, CalendarDays, Clock, MapPin, Check, CircleAlert, Users,
  Plus, X, Loader2, AlertTriangle, Trash2,
} from "lucide-react";

const BBQ_INFO = {
  title: "Aversa Family BBQ",
  day: "Saturday · July 18, 2026",
  time: "12 Noon – 4 PM",
  guests: 50,
};
const SECTION_ORDER = ["Paper Goods", "Hot Dogs & Grilling", 'The "Day-of" Items', "Also Bringing"];

interface BbqItem {
  id: number;
  section: string;
  item: string;
  amount: string;
  unit: string;
  claimed_by: string | null;
  note: string | null;
  sort_order: number;
}

const NAME_KEY = "reunion_bbq_name";
const MINE_KEY = "reunion_bbq_mine";

export default function BbqPage() {
  const [items, setItems] = useState<BbqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [name, setName] = useState("");
  const [mine, setMine] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);

  const [addItem, setAddItem] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [adding, setAdding] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  // Restore saved name + which items belong to this device.
  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
    try {
      const m = JSON.parse(localStorage.getItem(MINE_KEY) ?? "[]") as number[];
      setMine(new Set(m));
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bbq");
      if (!res.ok) throw new Error("bad response");
      const data = await res.json() as { items: BbqItem[] };
      setItems(data.items ?? []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000); // keep it fresh so nobody doubles up
    return () => clearInterval(id);
  }, [load]);

  function rememberName(n: string) {
    setName(n);
    localStorage.setItem(NAME_KEY, n);
  }
  function persistMine(next: Set<number>) {
    setMine(next);
    localStorage.setItem(MINE_KEY, JSON.stringify([...next]));
  }

  async function claim(id: number) {
    const who = name.trim();
    if (!who) { nameRef.current?.focus(); return; }
    setBusy(id);
    try {
      const res = await fetch("/api/bbq", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: who, action: "claim" }),
      });
      if (res.ok) {
        const { item } = await res.json() as { item: BbqItem };
        setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
        if (item.claimed_by === who) persistMine(new Set(mine).add(id));
        rememberName(who);
      }
    } catch { /* ignore */ } finally {
      setBusy(null);
    }
  }

  async function release(id: number) {
    setBusy(id);
    try {
      const res = await fetch("/api/bbq", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "release" }),
      });
      if (res.ok) {
        const { item } = await res.json() as { item: BbqItem };
        setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
        const next = new Set(mine); next.delete(id); persistMine(next);
      }
    } catch { /* ignore */ } finally {
      setBusy(null);
    }
  }

  async function submitAdd(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const who = name.trim();
    const it = addItem.trim();
    if (!who) { nameRef.current?.focus(); return; }
    if (!it) return;
    setAdding(true);
    try {
      const res = await fetch("/api/bbq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: it, amount: addAmount.trim(), unit: "", name: who }),
      });
      if (res.ok) {
        const { item } = await res.json() as { item: BbqItem };
        setItems((prev) => [...prev, item]);
        persistMine(new Set(mine).add(item.id));
        setAddItem(""); setAddAmount("");
        rememberName(who);
      }
    } catch { /* ignore */ } finally {
      setAdding(false);
    }
  }

  async function removeItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const next = new Set(mine); next.delete(id); persistMine(next);
    try {
      await fetch("/api/bbq", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch { /* ignore */ }
  }

  const total = items.length;
  const claimed = items.filter((i) => i.claimed_by).length;
  const needed = total - claimed;

  const bringers: { name: string; count: number }[] = [];
  for (const i of items) {
    if (!i.claimed_by) continue;
    const f = bringers.find((b) => b.name === i.claimed_by);
    if (f) f.count += 1;
    else bringers.push({ name: i.claimed_by, count: 1 });
  }

  const sections = SECTION_ORDER
    .map((s) => ({ title: s, list: items.filter((i) => i.section === s) }))
    .filter((s) => s.list.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-[#c28e2b]/20 bg-gradient-to-br from-[#1d4d33] to-[#14321f] px-6 py-8 sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#c28e2b]/8 blur-[80px]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#b39357]">
              <Flame className="h-4 w-4 text-[#c28e2b]" /> Food Sign-Up
            </div>
            <h1 className="mt-1 text-3xl text-[#f6f1e2] sm:text-4xl" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
              {BBQ_INFO.title}
            </h1>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-[#c8a86a]">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#c28e2b]" />{BBQ_INFO.day}
              </div>
              <div className="flex items-center gap-1.5 text-[#b39357]">
                <Clock className="h-4 w-4 shrink-0 text-[#c28e2b]" />{BBQ_INFO.time}
              </div>
              <div className="flex items-center gap-1.5 text-[#b39357]">
                <MapPin className="h-4 w-4 shrink-0 text-[#c28e2b]" />Planning for ~{BBQ_INFO.guests} guests
              </div>
            </div>
          </div>
        </div>

        {/* Your name */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <label className="text-sm font-medium text-foreground">Your name</label>
          <p className="text-xs text-muted-foreground">Enter it once, then tap <strong>I&apos;ll bring this</strong> on anything you&apos;re grabbing.</p>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => rememberName(e.target.value)}
            placeholder="e.g. Aunt Carol"
            className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-2 focus:ring-[#c28e2b]/20 transition-colors"
          />
        </div>

        {/* Loading / error */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the list…
          </div>
        )}
        {!loading && error && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#bf5a33]/30 bg-[#bf5a33]/5 p-5 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#bf5a33]" />
            <div>
              <p className="font-medium text-foreground">Couldn&apos;t load the BBQ list.</p>
              <p className="mt-1 text-muted-foreground">Please refresh in a moment.</p>
              <button onClick={load} className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-[#c28e2b]/40">Try again</button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[#5f8a57]/25 bg-card p-5">
                <div className="flex items-center gap-2 text-[#5f8a57]"><Check className="h-4 w-4" /><span className="text-sm">Claimed</span></div>
                <p className="mt-1 text-3xl font-bold tabular-nums">{claimed}</p>
              </div>
              <div className="rounded-xl border border-[#bf5a33]/25 bg-card p-5">
                <div className="flex items-center gap-2 text-[#bf5a33]"><CircleAlert className="h-4 w-4" /><span className="text-sm">Still needed</span></div>
                <p className="mt-1 text-3xl font-bold tabular-nums">{needed}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-border bg-card p-5 sm:col-span-1">
                <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /><span className="text-sm">Total items</span></div>
                <p className="mt-1 text-3xl font-bold tabular-nums">{total}</p>
              </div>
            </div>

            {/* Who's bringing */}
            {bringers.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Who&apos;s bringing</p>
                <div className="flex flex-wrap gap-2">
                  {bringers.map((b) => (
                    <span key={b.name} className="inline-flex items-center gap-1.5 rounded-full border border-[#c28e2b]/30 bg-[#c28e2b]/10 px-3 py-1 text-sm text-[#c28e2b]">
                      {b.name}
                      <span className="rounded-full bg-[#c28e2b]/20 px-1.5 text-xs tabular-nums">{b.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sections */}
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="mb-3 text-lg font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>{section.title}</h2>
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  {section.list.map((it, idx) => {
                    const isMine = mine.has(it.id);
                    const isAdded = it.section === "Also Bringing";
                    return (
                      <div key={it.id} className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5${idx > 0 ? " border-t border-border/60" : ""}`}>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{it.item}</p>
                          <p className="text-xs text-muted-foreground">
                            {[it.amount, it.unit].filter(Boolean).join(" · ")}
                            {it.note && <span className="text-[#bf5a33]"> · {it.note}</span>}
                          </p>
                        </div>

                        {it.claimed_by ? (
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5f8a57]/30 bg-[#5f8a57]/10 px-3 py-1 text-xs font-medium text-[#5f8a57]">
                              <Check className="h-3.5 w-3.5" />{it.claimed_by}
                            </span>
                            {isMine && !isAdded && (
                              <button onClick={() => release(it.id)} disabled={busy === it.id}
                                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-[#bf5a33]">
                                {busy === it.id ? "…" : "release"}
                              </button>
                            )}
                            {isMine && isAdded && (
                              <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-[#bf5a33]" aria-label="Remove">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => claim(it.id)}
                            disabled={busy === it.id}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#c28e2b] px-3.5 py-2 text-xs font-semibold text-[#14321f] transition-colors hover:bg-[#bf5a33] hover:text-[#f6f1e2] disabled:opacity-50"
                          >
                            {busy === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            I&apos;ll bring this
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Add your own */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Bringing something else?</h2>
              <p className="text-sm text-muted-foreground">Add a dish or item you&apos;re bringing so we don&apos;t double up.</p>
              <form onSubmit={submitAdd} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={addItem}
                  onChange={(e) => setAddItem(e.target.value)}
                  placeholder="What are you bringing?"
                  className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-2 focus:ring-[#c28e2b]/20 transition-colors"
                />
                <input
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="Qty (optional)"
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-2 focus:ring-[#c28e2b]/20 transition-colors sm:w-36"
                />
                <button
                  type="submit"
                  disabled={adding || !addItem.trim()}
                  className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-[#c28e2b] px-5 text-base font-semibold text-[#14321f] transition-colors hover:bg-[#bf5a33] hover:text-[#f6f1e2] disabled:opacity-50"
                >
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
                </button>
              </form>
              {!name.trim() && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <X className="h-3 w-3" /> Add your name above first.
                </p>
              )}
            </div>

            <p className="pt-2 text-center text-xs text-muted-foreground">
              Aversa Family BBQ · {BBQ_INFO.day} · {BBQ_INFO.time} · Updates live
            </p>
          </>
        )}
      </div>
    </div>
  );
}
