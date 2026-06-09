"use client";

import { useState, useEffect, useCallback } from "react";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2, AlertTriangle, PartyPopper } from "lucide-react";

interface SignupEvent {
  id: number;
  emoji: string;
  title: string;
  date_label: string;
  description: string;
  sort_order: number;
}
interface Contribution {
  id: number;
  event_id: number;
  name: string;
  item: string;
  created_at: string;
}

const NAME_KEY = "reunion_signup_name";
const MINE_KEY = "reunion_signup_mine";

export default function SignupPage() {
  const [events, setEvents] = useState<SignupEvent[]>([]);
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [name, setName] = useState("");
  const [mine, setMine] = useState<Set<number>>(new Set());
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  // Restore the saved name + which contributions belong to this device.
  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
    try {
      const m = JSON.parse(localStorage.getItem(MINE_KEY) ?? "[]") as number[];
      setMine(new Set(m));
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/signups");
      if (!res.ok) throw new Error("bad response");
      const data = await res.json() as { events: SignupEvent[]; contributions: Contribution[] };
      setEvents(data.events ?? []);
      setContribs(data.contributions ?? []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000); // keep the list fresh so nobody doubles up
    return () => clearInterval(id);
  }, [load]);

  function persistMine(next: Set<number>) {
    setMine(next);
    localStorage.setItem(MINE_KEY, JSON.stringify([...next]));
  }

  function rememberName(n: string) {
    setName(n);
    localStorage.setItem(NAME_KEY, n);
  }

  async function addContribution(eventId: number) {
    const who = name.trim();
    const item = (drafts[eventId] ?? "").trim();
    if (!who || !item) return;
    setBusy(eventId);
    try {
      const res = await fetch("/api/signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, name: who, item }),
      });
      if (res.ok) {
        const row = await res.json() as Contribution;
        setContribs(prev => [...prev, row]);
        persistMine(new Set(mine).add(row.id));
        setDrafts(d => ({ ...d, [eventId]: "" }));
        rememberName(who);
      }
    } catch { /* ignore */ } finally {
      setBusy(null);
    }
  }

  async function removeContribution(id: number) {
    setContribs(prev => prev.filter(c => c.id !== id));
    const next = new Set(mine);
    next.delete(id);
    persistMine(next);
    try { await fetch(`/api/signups/${id}`, { method: "DELETE" }); } catch { /* ignore */ }
  }

  function contributionsFor(eventId: number) {
    return contribs.filter(c => c.event_id === eventId);
  }

  // Soft duplicate detection: warn if the draft item looks like one already claimed.
  function duplicateOf(eventId: number): string | null {
    const draft = (drafts[eventId] ?? "").trim().toLowerCase();
    if (draft.length < 2) return null;
    const match = contributionsFor(eventId).find(c => {
      const it = c.item.trim().toLowerCase();
      return it === draft || it.includes(draft) || draft.includes(it);
    });
    return match ? match.item : null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl text-foreground" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
            Sign-Up &amp; What I&apos;m Bringing
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Add what you plan to bring so we don&apos;t end up with five potato salads. Everyone can see the list!
          </p>
        </div>

        {/* Your name */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <label className="text-xs font-medium text-muted-foreground">Your name</label>
          <input
            value={name}
            onChange={(e) => rememberName(e.target.value)}
            placeholder="e.g. Aunt Carol"
            className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-2 focus:ring-[#c28e2b]/20 transition-colors"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">Saved on this device so you only type it once.</p>
        </div>

        {/* Loading / error states */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sign-ups…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#bf5a33]/30 bg-[#bf5a33]/5 p-5 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#bf5a33]" />
            <div>
              <p className="font-medium text-foreground">Couldn&apos;t load the sign-up list.</p>
              <p className="mt-1 text-muted-foreground">Please refresh in a moment — the list lives on the family server.</p>
              <Button onClick={load} variant="outline" size="sm" className="mt-3">Try again</Button>
            </div>
          </div>
        )}

        {/* Events */}
        {!loading && !error && events.map((event) => {
          const list = contributionsFor(event.id);
          const dup = duplicateOf(event.id);
          const draft = drafts[event.id] ?? "";
          return (
            <div key={event.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              {/* Event header */}
              <div className="border-b border-border/60 bg-[#c28e2b]/5 px-5 py-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl">{event.emoji}</span>
                  <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-playfair)" }}>
                    {event.title}
                  </h2>
                  {event.date_label && (
                    <span className="ml-auto text-xs font-medium uppercase tracking-wider text-[#c28e2b]">{event.date_label}</span>
                  )}
                </div>
                {event.description && <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>}
              </div>

              {/* Contribution list */}
              <div className="px-5 py-4 space-y-2">
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nothing yet — be the first to sign up!</p>
                ) : (
                  list.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5">
                      <span className="text-[#c28e2b]">🧺</span>
                      <span className="text-sm text-foreground">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground"> — {c.item}</span>
                      </span>
                      {mine.has(c.id) && (
                        <button
                          onClick={() => removeContribution(c.id)}
                          className="ml-auto rounded-lg p-1 text-muted-foreground hover:text-[#bf5a33] transition-colors"
                          title="Remove (yours)"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add form */}
              <div className="border-t border-border/60 px-5 py-4 space-y-2">
                {dup && (
                  <p className="flex items-center gap-1.5 text-xs text-[#bf5a33]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Heads up — someone may already be bringing &ldquo;{dup}&rdquo;.
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDrafts(d => ({ ...d, [event.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") addContribution(event.id); }}
                    placeholder="What are you bringing?"
                    className="h-10 flex-1 rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-2 focus:ring-[#c28e2b]/20 transition-colors"
                  />
                  <Button
                    onClick={() => addContribution(event.id)}
                    disabled={!name.trim() || !draft.trim() || busy === event.id}
                    className="h-10 shrink-0 gap-1.5 bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-[#f6f1e2]"
                  >
                    {busy === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add
                  </Button>
                </div>
                {!name.trim() && (
                  <p className="text-xs text-muted-foreground">Enter your name above first.</p>
                )}
              </div>
            </div>
          );
        })}

        {!loading && !error && events.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <PartyPopper className="h-6 w-6 text-[#c28e2b]" />
            <p className="text-sm">No sign-up events yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
