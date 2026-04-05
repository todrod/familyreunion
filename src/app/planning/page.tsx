"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, BedDouble, CalendarDays, MapPin, Clock,
  Minus, Plus, X, Edit2, Trash2, Check, Download, PawPrint,
} from "lucide-react";

/* ─── Reunion constants ─────────────────────────────────────────── */
const REUNION = {
  name: "Family Reunion 2026",
  dates: "TBD — Summer 2026",
  location: "Tinton Falls, NJ",
  hotelDeadline: "TBD",
  hotels: ["Radisson in Freehold", "Colts Neck Hotel", "The Hawthorne"],
  targetRooms: 25,
};

const HOTELS = ["No preference", ...REUNION.hotels];
const ROOM_TYPES = ["No preference", "King", "Two Doubles", "Adjoining Rooms", "Suite"];
const RSVP_STATUSES = [
  { value: "interested", label: "Interested", color: "bg-blue-500/10 text-blue-400 border-blue-400/20" },
  { value: "confirmed",  label: "Confirmed",  color: "bg-[#8b9b6e]/15 text-[#8b9b6e] border-[#8b9b6e]/25" },
  { value: "deposit",    label: "Deposit Paid", color: "bg-[#d4a853]/15 text-[#d4a853] border-[#d4a853]/25" },
];

/* ─── Types ─────────────────────────────────────────────────────── */
interface Family {
  id: number;
  family_name: string;
  contact_name: string;
  rooms_requested: number;
  nights: number;
  hotel_preference: string;
  has_pets: number;
  room_type: string;
  rsvp_status: string;
  attendees: string;
  notes: string;
  created_at: string;
}

const EMPTY_FORM = {
  family_name: "",
  contact_name: "",
  rooms_requested: 1,
  nights: 3,
  hotel_preference: "No preference",
  has_pets: false,
  room_type: "No preference",
  rsvp_status: "interested",
  attendees: [] as string[],
  attendee_input: "",
  notes: "",
};

/* ─── Stepper ────────────────────────────────────────────────────── */
function Stepper({ value, min = 1, max = 20, onChange }: {
  value: number; min?: number; max?: number; onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-[#d4a853] hover:text-[#d4a853] transition-colors">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-base font-semibold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-[#d4a853] hover:text-[#d4a853] transition-colors">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─── Select ─────────────────────────────────────────────────────── */
function Select({ value, onChange, options, className = "" }: {
  value: string; onChange: (v: string) => void;
  options: string[] | { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:border-[#d4a853]/60 focus:outline-none focus:ring-2 focus:ring-[#d4a853]/20 transition-colors ${className}`}
    >
      {options.map((o) =>
        typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  );
}

/* ─── Attendee chip input ────────────────────────────────────────── */
function AttendeeInput({ chips, onAdd, onRemove, inputVal, onInputChange }: {
  chips: string[]; onAdd: (n: string) => void; onRemove: (n: string) => void;
  inputVal: string; onInputChange: (v: string) => void;
}) {
  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const name = inputVal.trim().replace(/,$/, "");
      if (name && !chips.includes(name)) onAdd(name);
    }
    if (e.key === "Backspace" && !inputVal && chips.length) onRemove(chips[chips.length - 1]);
  }
  function handleBlur() {
    const name = inputVal.trim().replace(/,$/, "");
    if (name && !chips.includes(name)) onAdd(name);
  }
  return (
    <div className="flex min-h-[38px] flex-wrap gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 focus-within:border-[#d4a853]/60 focus-within:ring-2 focus-within:ring-[#d4a853]/20 transition-colors">
      {chips.map((chip) => (
        <span key={chip} className="inline-flex items-center gap-1 rounded-md bg-[#d4a853]/15 px-2 py-0.5 text-xs font-medium text-[#d4a853]">
          {chip}
          <button type="button" onClick={() => onRemove(chip)} className="opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
        </span>
      ))}
      <input
        value={inputVal}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={handleKey}
        onBlur={handleBlur}
        placeholder={chips.length === 0 ? "Type a name, press Enter or comma…" : "Add another…"}
        className="min-w-[140px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

/* ─── RSVP badge ─────────────────────────────────────────────────── */
function RsvpBadge({ status }: { status: string }) {
  const s = RSVP_STATUSES.find((r) => r.value === status) ?? RSVP_STATUSES[0];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>;
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function PlanningPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Family>>({});
  const [editChips, setEditChips] = useState<string[]>([]);
  const [editChipInput, setEditChipInput] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFamilies = useCallback(async () => {
    const res = await fetch("/api/families");
    if (res.ok) { setFamilies(await res.json()); setLastUpdated(new Date()); }
  }, []);

  useEffect(() => {
    fetchFamilies();
    intervalRef.current = setInterval(fetchFamilies, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchFamilies]);

  /* Derived stats */
  const totalRooms  = families.reduce((s, f) => s + f.rooms_requested, 0);
  const totalPeople = families.reduce((s, f) => s + f.attendees.split(",").filter(Boolean).length, 0);
  const roomPct     = Math.min(100, Math.round((totalRooms / REUNION.targetRooms) * 100));
  const withPets    = families.filter((f) => f.has_pets).length;

  /* Hotel breakdown */
  const hotelBreakdown = REUNION.hotels.map((h) => ({
    hotel: h,
    rooms: families.filter((f) => f.hotel_preference === h).reduce((s, f) => s + f.rooms_requested, 0),
    groups: families.filter((f) => f.hotel_preference === h).length,
  }));

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.family_name || !form.contact_name) return;
    setSubmitting(true);
    const res = await fetch("/api/families", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        attendees: form.attendees.join(", "),
        has_pets: form.has_pets ? 1 : 0,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      const newFamily = await res.json();
      setFamilies((prev) => [...prev, newFamily]);
      setForm(EMPTY_FORM);
      toast.success(`${form.family_name} added!`, { description: "You're on the list. See you there!" });
    }
  }

  async function handleDelete(id: number, name: string) {
    await fetch(`/api/families/${id}`, { method: "DELETE" });
    setFamilies((prev) => prev.filter((f) => f.id !== id));
    toast(`${name} removed from the list.`);
  }

  function startEdit(family: Family) {
    setEditingId(family.id);
    setEditForm({ ...family });
    setEditChips(family.attendees.split(",").map((s) => s.trim()).filter(Boolean));
    setEditChipInput("");
  }

  async function saveEdit(id: number) {
    const res = await fetch(`/api/families/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, attendees: editChips.join(", ") }),
    });
    if (res.ok) {
      setFamilies((prev) => prev.map((f) => (f.id === id ? { ...f, ...(editForm as Family), attendees: editChips.join(", ") } : f)));
      setEditingId(null);
      toast.success("Changes saved.");
    }
  }

  return (
    <div className="min-h-screen bg-background">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4a853]/15 text-[#d4a853]">
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
                <path d="M10 2C6.5 2 4 4.5 4 7.5c0 2.5 1.5 4.5 3.5 5.5V16l2.5-1.5L12.5 16v-3C14.5 12 16 10 16 7.5 16 4.5 13.5 2 10 2Z" stroke="#d4a853" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Family Reunion</span>
              <span className="ml-1.5 text-xs text-muted-foreground">· Rodriguez · Aversa</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-xs text-muted-foreground sm:block">
                Live · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <a
              href="/api/families/export"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-[#d4a853]/40 hover:text-foreground transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-[#d4a853]/20 bg-gradient-to-br from-[#261a0c] to-[#1c1208] px-6 py-8 sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#d4a853]/8 blur-[80px]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.2em] text-[#a0886a]">Planning Hub</p>
            <h1 className="mt-1 text-3xl text-[#f5ede0] sm:text-4xl" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
              {REUNION.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-[#c4a97d]">
                <CalendarDays className="h-4 w-4 text-[#d4a853]" />{REUNION.dates}
              </div>
              <div className="flex items-center gap-1.5 text-[#c4a97d]">
                <MapPin className="h-4 w-4 text-[#d4a853]" />{REUNION.location}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[#a0886a]">
                <Clock className="h-4 w-4" /><span>Date TBD — check back soon</span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {REUNION.hotels.map((h) => (
                <span key={h} className="rounded-full border border-[#d4a853]/25 bg-[#d4a853]/10 px-3 py-1 text-xs text-[#c4a97d]">{h}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="border-[#d4a853]/20 bg-card col-span-2 sm:col-span-1">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d4a853]/15">
                <BedDouble className="h-5 w-5 text-[#d4a853]" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums">{totalRooms}</p>
                <p className="text-sm text-muted-foreground">Rooms</p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-[#d4a853] transition-all duration-500" style={{ width: `${roomPct}%` }} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{roomPct}% of {REUNION.targetRooms} target</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#c8553d]/20 bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#c8553d]/15">
                <Users className="h-5 w-5 text-[#c8553d]" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{families.length}</p>
                <p className="text-sm text-muted-foreground">Groups</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{totalPeople} people</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#8b9b6e]/20 bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8b9b6e]/15">
                <CalendarDays className="h-5 w-5 text-[#8b9b6e]" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">
                  {families.length > 0 ? Math.round(families.reduce((s, f) => s + f.nights, 0) / families.length) : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg nights</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Across all groups</p>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-card ${withPets > 0 ? "border-amber-500/30" : "border-border"}`}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${withPets > 0 ? "bg-amber-500/15" : "bg-border/40"}`}>
                <PawPrint className={`h-5 w-5 ${withPets > 0 ? "text-amber-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{withPets}</p>
                <p className="text-sm text-muted-foreground">With pets</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Need pet-friendly hotel</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Hotel breakdown ── */}
        {families.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {hotelBreakdown.map(({ hotel, rooms, groups }) => (
              <div key={hotel} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{hotel.replace(" in Freehold", "").replace("The ", "")}</p>
                  <p className="text-xs text-muted-foreground">{groups} {groups === 1 ? "group" : "groups"}</p>
                </div>
                <Badge className="border-[#d4a853]/30 bg-[#d4a853]/10 text-[#d4a853] tabular-nums">
                  {rooms} {rooms === 1 ? "room" : "rooms"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* ── Family list ── */}
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>Who&apos;s Coming</h2>
            <p className="text-sm text-muted-foreground">Updates live every 5 seconds</p>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {families.length === 0 && (
              <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                No one yet — add your family below!
              </div>
            )}
            {families.map((family) =>
              editingId === family.id ? (
                <Card key={family.id} className="border-[#d4a853]/30 bg-[#d4a853]/5">
                  <CardContent className="space-y-3 p-4">
                    <Input value={editForm.family_name || ""} onChange={(e) => setEditForm((p) => ({ ...p, family_name: e.target.value }))} placeholder="Family name" className="text-sm" />
                    <Input value={editForm.contact_name || ""} onChange={(e) => setEditForm((p) => ({ ...p, contact_name: e.target.value }))} placeholder="Contact name" className="text-sm" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Rooms</Label><Stepper value={editForm.rooms_requested || 1} onChange={(n) => setEditForm((p) => ({ ...p, rooms_requested: n }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Nights</Label><Stepper value={editForm.nights || 3} onChange={(n) => setEditForm((p) => ({ ...p, nights: n }))} /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Hotel</Label><Select value={editForm.hotel_preference || "No preference"} onChange={(v) => setEditForm((p) => ({ ...p, hotel_preference: v }))} options={HOTELS} /></div>
                    <div className="space-y-1"><Label className="text-xs">Room type</Label><Select value={editForm.room_type || "No preference"} onChange={(v) => setEditForm((p) => ({ ...p, room_type: v }))} options={ROOM_TYPES} /></div>
                    <div className="space-y-1"><Label className="text-xs">RSVP Status</Label><Select value={editForm.rsvp_status || "interested"} onChange={(v) => setEditForm((p) => ({ ...p, rsvp_status: v }))} options={RSVP_STATUSES.map((s) => ({ value: s.value, label: s.label }))} /></div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!editForm.has_pets} onChange={(e) => setEditForm((p) => ({ ...p, has_pets: e.target.checked ? 1 : 0 }))} className="h-4 w-4 accent-[#d4a853]" />
                      Bringing pets
                    </label>
                    <div className="space-y-1"><Label className="text-xs">Attendees</Label><AttendeeInput chips={editChips} onAdd={(n) => { if (!editChips.includes(n)) setEditChips((p) => [...p, n]); setEditChipInput(""); }} onRemove={(n) => setEditChips((p) => p.filter((c) => c !== n))} inputVal={editChipInput} onInputChange={setEditChipInput} /></div>
                    <Textarea value={editForm.notes || ""} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes…" rows={2} className="text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-[#d4a853] text-[#1c1208] hover:bg-[#c8553d] hover:text-white" onClick={() => saveEdit(family.id)}><Check className="mr-1 h-3.5 w-3.5" />Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card key={family.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{family.family_name}</p>
                          {family.has_pets === 1 && <PawPrint className="h-3.5 w-3.5 text-amber-400" />}
                        </div>
                        <p className="text-xs text-muted-foreground">Contact: {family.contact_name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="border-[#d4a853]/30 bg-[#d4a853]/10 text-[#d4a853]">{family.rooms_requested} {family.rooms_requested === 1 ? "room" : "rooms"}</Badge>
                        <RsvpBadge status={family.rsvp_status} />
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-1.5 text-sm">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{family.nights} nights</span>
                        {family.hotel_preference && family.hotel_preference !== "No preference" && (
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{family.hotel_preference.replace(" in Freehold", "")}</span>
                        )}
                        {family.room_type && family.room_type !== "No preference" && (
                          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{family.room_type}</span>
                        )}
                      </div>
                      {family.attendees && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {family.attendees.split(",").map((n) => n.trim()).filter(Boolean).map((n) => (
                            <span key={n} className="rounded-md bg-[#d4a853]/10 px-1.5 py-0.5 text-xs text-[#d4a853]">{n}</span>
                          ))}
                        </div>
                      )}
                      {family.notes && <p className="text-xs text-muted-foreground italic">{family.notes}</p>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => startEdit(family)}><Edit2 className="mr-1 h-3 w-3" />Edit</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#c8553d]" onClick={() => handleDelete(family.id, family.family_name)}><Trash2 className="mr-1 h-3 w-3" />Remove</Button>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* Desktop table */}
          <Card className="hidden border-border bg-card sm:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Family</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-center text-muted-foreground">Rooms</TableHead>
                    <TableHead className="text-center text-muted-foreground">Nights</TableHead>
                    <TableHead className="text-muted-foreground">Hotel</TableHead>
                    <TableHead className="text-muted-foreground">Room Type</TableHead>
                    <TableHead className="text-center text-muted-foreground">Pets</TableHead>
                    <TableHead className="text-muted-foreground">Attendees</TableHead>
                    <TableHead className="text-muted-foreground">Notes</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {families.length === 0 && (
                    <TableRow className="border-border">
                      <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                        No entries yet — add your family below!
                      </TableCell>
                    </TableRow>
                  )}
                  {families.map((family) =>
                    editingId === family.id ? (
                      <TableRow key={family.id} className="border-border bg-[#d4a853]/5">
                        <TableCell><Input value={editForm.family_name || ""} onChange={(e) => setEditForm((p) => ({ ...p, family_name: e.target.value }))} className="h-7 text-xs" /></TableCell>
                        <TableCell><Select value={editForm.rsvp_status || "interested"} onChange={(v) => setEditForm((p) => ({ ...p, rsvp_status: v }))} options={RSVP_STATUSES.map((s) => ({ value: s.value, label: s.label }))} /></TableCell>
                        <TableCell><Stepper value={editForm.rooms_requested || 1} onChange={(n) => setEditForm((p) => ({ ...p, rooms_requested: n }))} /></TableCell>
                        <TableCell><Stepper value={editForm.nights || 3} onChange={(n) => setEditForm((p) => ({ ...p, nights: n }))} /></TableCell>
                        <TableCell><Select value={editForm.hotel_preference || "No preference"} onChange={(v) => setEditForm((p) => ({ ...p, hotel_preference: v }))} options={HOTELS} /></TableCell>
                        <TableCell><Select value={editForm.room_type || "No preference"} onChange={(v) => setEditForm((p) => ({ ...p, room_type: v }))} options={ROOM_TYPES} /></TableCell>
                        <TableCell className="text-center"><input type="checkbox" checked={!!editForm.has_pets} onChange={(e) => setEditForm((p) => ({ ...p, has_pets: e.target.checked ? 1 : 0 }))} className="h-4 w-4 accent-[#d4a853]" /></TableCell>
                        <TableCell><AttendeeInput chips={editChips} onAdd={(n) => { if (!editChips.includes(n)) setEditChips((p) => [...p, n]); setEditChipInput(""); }} onRemove={(n) => setEditChips((p) => p.filter((c) => c !== n))} inputVal={editChipInput} onInputChange={setEditChipInput} /></TableCell>
                        <TableCell><Input value={editForm.notes || ""} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} className="h-7 text-xs" /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 px-2 text-xs bg-[#d4a853] text-[#1c1208] hover:bg-[#c8553d] hover:text-white" onClick={() => saveEdit(family.id)}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={family.id} className="border-border hover:bg-muted/30">
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1.5 font-medium">
                              {family.family_name}
                              {family.has_pets === 1 && <PawPrint className="h-3.5 w-3.5 text-amber-400" />}
                            </div>
                            <p className="text-xs text-muted-foreground">{family.contact_name}</p>
                          </div>
                        </TableCell>
                        <TableCell><RsvpBadge status={family.rsvp_status} /></TableCell>
                        <TableCell className="text-center"><Badge className="border-[#d4a853]/30 bg-[#d4a853]/10 text-[#d4a853]">{family.rooms_requested}</Badge></TableCell>
                        <TableCell className="text-center text-muted-foreground">{family.nights}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{family.hotel_preference && family.hotel_preference !== "No preference" ? family.hotel_preference.replace(" in Freehold", "") : <span className="text-border">—</span>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{family.room_type && family.room_type !== "No preference" ? family.room_type : <span className="text-border">—</span>}</TableCell>
                        <TableCell className="text-center">{family.has_pets === 1 ? <PawPrint className="mx-auto h-4 w-4 text-amber-400" /> : <span className="text-border">—</span>}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {family.attendees ? family.attendees.split(",").map((n) => n.trim()).filter(Boolean).map((n) => (
                              <span key={n} className="rounded-md bg-[#d4a853]/10 px-1.5 py-0.5 text-xs text-[#d4a853]">{n}</span>
                            )) : <span className="text-border">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[140px] text-sm text-muted-foreground">{family.notes || <span className="text-border">—</span>}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => startEdit(family)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#c8553d]" onClick={() => handleDelete(family.id, family.family_name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* ── Intake form ── */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg" style={{ fontFamily: "var(--font-playfair)" }}>Add Your Family</CardTitle>
            <p className="text-sm text-muted-foreground">Fill this in and you&apos;ll appear in the list instantly.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="family_name">Family Branch / Name *</Label>
                  <Input id="family_name" required placeholder="e.g. DiNicola — Southern" value={form.family_name} onChange={(e) => setForm((p) => ({ ...p, family_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_name">Your Name *</Label>
                  <Input id="contact_name" required placeholder="e.g. Carol" value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Hotel Preference</Label>
                  <Select value={form.hotel_preference} onChange={(v) => setForm((p) => ({ ...p, hotel_preference: v }))} options={HOTELS} />
                </div>
                <div className="space-y-1.5">
                  <Label>Room Type</Label>
                  <Select value={form.room_type} onChange={(v) => setForm((p) => ({ ...p, room_type: v }))} options={ROOM_TYPES} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Rooms Needed</Label>
                  <Stepper value={form.rooms_requested} onChange={(n) => setForm((p) => ({ ...p, rooms_requested: n }))} />
                </div>
                <div className="space-y-2">
                  <Label>Nights</Label>
                  <Stepper value={form.nights} onChange={(n) => setForm((p) => ({ ...p, nights: n }))} />
                </div>
                <div className="space-y-2">
                  <Label>RSVP Status</Label>
                  <Select value={form.rsvp_status} onChange={(v) => setForm((p) => ({ ...p, rsvp_status: v }))} options={RSVP_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 hover:border-[#d4a853]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={form.has_pets}
                  onChange={(e) => setForm((p) => ({ ...p, has_pets: e.target.checked }))}
                  className="h-4 w-4 accent-[#d4a853]"
                />
                <div>
                  <p className="text-sm font-medium">Bringing pets</p>
                  <p className="text-xs text-muted-foreground">Note: Radisson in Freehold does not allow pets</p>
                </div>
                <PawPrint className="ml-auto h-4 w-4 text-muted-foreground" />
              </label>

              <div className="space-y-1.5">
                <Label>Who&apos;s Coming</Label>
                <AttendeeInput chips={form.attendees} onAdd={(n) => setForm((p) => ({ ...p, attendees: [...p.attendees, n], attendee_input: "" }))} onRemove={(n) => setForm((p) => ({ ...p, attendees: p.attendees.filter((a) => a !== n) }))} inputVal={form.attendee_input} onInputChange={(v) => setForm((p) => ({ ...p, attendee_input: v }))} />
                <p className="text-xs text-muted-foreground">Type each name and press Enter or comma to add.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="e.g. need adjoining rooms, dietary needs, mobility considerations…" rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>

              <Button type="submit" disabled={submitting} className="bg-[#d4a853] text-[#1c1208] hover:bg-[#c8553d] hover:text-white transition-colors font-medium">
                {submitting ? "Adding…" : "Add to the List"}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
