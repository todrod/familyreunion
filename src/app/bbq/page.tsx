import { SiteNav } from "@/components/site-nav";
import {
  Flame, CalendarDays, Clock, MapPin, Check, CircleAlert, Users,
} from "lucide-react";

/* ─── BBQ checklist data ─────────────────────────────────────────────
   Seeded from the Aversa Family BBQ sign-up sheet. `who: null` means the
   item is still up for grabs. Update here as people claim items. */
const BBQ = {
  title: "Aversa Family BBQ",
  day: "Saturday · July 18, 2026",
  time: "12 Noon – 4 PM",
  guests: 50,
  // Bump this whenever the list below changes, so everyone knows it's current.
  updated: "June 8, 2026",
};

interface BbqItem {
  item: string;
  amount: string;
  unit: string;
  who: string | null;
  note?: string;
}

const SECTIONS: { title: string; items: BbqItem[] }[] = [
  {
    title: "Paper Goods",
    items: [
      { item: "Plates, Forks, Cups & Napkins", amount: "For", unit: "50 guests", who: "Mike & Joanne" },
    ],
  },
  {
    title: "Hot Dogs & Grilling",
    items: [
      { item: "Hot Dogs", amount: "2 pkgs.", unit: "36 each", who: "Tom & Angela" },
      { item: "Martin's Hot Dog Rolls", amount: "4 pkgs.", unit: "16 each", who: "Tom & Angela" },
      { item: "Mustard, Ketchup & Relish", amount: "1", unit: "Set", who: "Tom & Angela" },
      { item: "BBQ Tools & Knife", amount: "1", unit: "Set", who: "Tom & Angela" },
      { item: "Aluminum Foil", amount: "1", unit: "Roll", who: "Tom & Angela" },
      { item: "Cutting Board", amount: "1", unit: "Each", who: "Tom & Angela" },
    ],
  },
  {
    title: 'The "Day-of" Items',
    items: [
      { item: "Hamburger Patties", amount: "For", unit: "50 guests", who: null },
      { item: "Hamburger Buns", amount: "For", unit: "50 guests", who: null },
      { item: "American Cheese, Slices", amount: "For", unit: "Burgers", who: null },
      { item: "Charcoal, Briquettes", amount: "1 small", unit: "Bag", who: null },
      { item: "Lighter Fluid", amount: "1", unit: "Pint", who: null },
      { item: "Potato Salad", amount: "3", unit: "lbs.", who: null },
      { item: "Cole Slaw", amount: "2", unit: "lbs.", who: null },
      { item: "Marshmallows", amount: "1", unit: "Bag", who: null },
      { item: "Ice, Cubes", amount: "4", unit: "10 lb. bags", who: null, note: "? or Hotel" },
      { item: "Watermelon", amount: "2", unit: "Large", who: "Justin & Belinda" },
      { item: "Beer (Your Choice), Cans", amount: "1", unit: "Case", who: "Justin & Belinda" },
      { item: "Soda Cans (Cola & Sprite)", amount: "2", unit: "Cases", who: "Justin & Belinda" },
      { item: "Snapple Iced Tea", amount: "1", unit: "Case", who: null },
      { item: "Bottled Water", amount: "1", unit: "Case", who: null },
      { item: "Mini Cupcakes", amount: "For", unit: "25 guests", who: null },
      { item: "Cookies", amount: "For", unit: "25 guests", who: null },
    ],
  },
];

export default function BbqPage() {
  const all = SECTIONS.flatMap((s) => s.items);
  const total = all.length;
  const claimed = all.filter((i) => i.who).length;
  const needed = total - claimed;

  // Who's bringing what (preserve first-seen order).
  const bringers: { name: string; count: number }[] = [];
  for (const i of all) {
    if (!i.who) continue;
    const found = bringers.find((b) => b.name === i.who);
    if (found) found.count += 1;
    else bringers.push({ name: i.who, count: 1 });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-[#c28e2b]/20 bg-gradient-to-br from-[#1d4d33] to-[#14321f] px-6 py-8 sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#c28e2b]/8 blur-[80px]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#b39357]">
              <Flame className="h-4 w-4 text-[#c28e2b]" /> Food Sign-Up
            </div>
            <h1 className="mt-1 text-3xl text-[#f6f1e2] sm:text-4xl" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
              {BBQ.title}
            </h1>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-1.5 text-[#c8a86a]">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#c28e2b]" />{BBQ.day}
              </div>
              <div className="flex items-center gap-1.5 text-[#b39357]">
                <Clock className="h-4 w-4 shrink-0 text-[#c28e2b]" />{BBQ.time}
              </div>
              <div className="flex items-center gap-1.5 text-[#b39357]">
                <MapPin className="h-4 w-4 shrink-0 text-[#c28e2b]" />Planning for ~{BBQ.guests} guests
              </div>
            </div>
          </div>
        </div>

        {/* ── Last updated ── */}
        <p className="-mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Last updated {BBQ.updated}
        </p>

        {/* ── Progress summary ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#5f8a57]/25 bg-card p-5">
            <div className="flex items-center gap-2 text-[#5f8a57]">
              <Check className="h-4 w-4" /><span className="text-sm">Claimed</span>
            </div>
            <p className="mt-1 text-3xl font-bold tabular-nums">{claimed}</p>
          </div>
          <div className="rounded-xl border border-[#bf5a33]/25 bg-card p-5">
            <div className="flex items-center gap-2 text-[#bf5a33]">
              <CircleAlert className="h-4 w-4" /><span className="text-sm">Still needed</span>
            </div>
            <p className="mt-1 text-3xl font-bold tabular-nums">{needed}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-border bg-card p-5 sm:col-span-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" /><span className="text-sm">Total items</span>
            </div>
            <p className="mt-1 text-3xl font-bold tabular-nums">{total}</p>
          </div>
        </div>

        {/* ── Who's bringing ── */}
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

        {/* ── Sections ── */}
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-lg font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
              {section.title}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {section.items.map((it, idx) => (
                <div
                  key={it.item}
                  className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5${idx > 0 ? " border-t border-border/60" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{it.item}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.amount} · {it.unit}
                      {it.note && <span className="text-[#bf5a33]"> · {it.note}</span>}
                    </p>
                  </div>
                  {it.who ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#5f8a57]/30 bg-[#5f8a57]/10 px-3 py-1 text-xs font-medium text-[#5f8a57]">
                      <Check className="h-3.5 w-3.5" />{it.who}
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#bf5a33]/30 bg-[#bf5a33]/10 px-3 py-1 text-xs font-medium text-[#bf5a33]">
                      <CircleAlert className="h-3.5 w-3.5" />Still needed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Aversa Family BBQ · {BBQ.day} · {BBQ.time} · Updated {BBQ.updated}
        </p>
      </div>
    </div>
  );
}
