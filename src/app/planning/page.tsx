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
import Image from "next/image";
import Link from "next/link";
import {
  Users, BedDouble, CalendarDays, MapPin, Clock,
  Minus, Plus, X, Edit2, Trash2, Check, Download, PawPrint,
  Phone, ExternalLink, UtensilsCrossed, Waves,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";

/* ─── Reunion constants ─────────────────────────────────────────── */
const REUNION = {
  name: "14th Aversa Family Reunion",
  dates: "July 17–19, 2026 (Check-in Jul 17 · Checkout Jul 19)",
  location: "300 Spring Valley Rd, Old Bridge, NJ 08857",
  hotelDeadline: "June 17, 2026",
  hotels: ["Hampton Inn Old Bridge"],
  targetRooms: 20,
  bookingUrl: "https://www.hilton.com/en/book/reservation/deeplink/?ctyhocn=EWROBHX&groupCode=CHHMAR&arrivaldate=2026-07-17&departuredate=2026-07-19&cid=OM,WW,HILTONLINK,EN,DirectLink&fromId=HILTONLINKDIRECT",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Hampton+Inn+Old+Bridge+300+Spring+Valley+Road+Old+Bridge+NJ+08857",
  phone: "732-851-0300",
  checkinDate: new Date("2026-07-17T16:00:00"),
};

const HOTELS = ["No preference", ...REUNION.hotels];
const ROOM_TYPES = ["No preference", "King", "Two Doubles", "Adjoining Rooms", "Suite"];
const RSVP_STATUSES = [
  { value: "interested", label: "Interested", color: "bg-blue-500/10 text-blue-400 border-blue-400/20" },
  { value: "confirmed",  label: "Confirmed",  color: "bg-[#8b9b6e]/15 text-[#8b9b6e] border-[#8b9b6e]/25" },
  { value: "deposit",    label: "Deposit Paid", color: "bg-[#C99500]/15 text-[#C99500] border-[#C99500]/25" },
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
  phone: string;
  room_number: string;
  notes: string;
  created_at: string;
}

const EMPTY_FORM = {
  family_name: "",
  rooms_requested: 1,
  nights: 2,
  has_pets: false,
  room_type: "No preference",
  rsvp_status: "interested",
  group_size: 1,
  phone: "",
  room_number: "",
  notes: "",
};

/* ─── Stepper ────────────────────────────────────────────────────── */
function Stepper({ value, min = 1, max = 20, onChange }: {
  value: number; min?: number; max?: number; onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-[#C99500] hover:text-[#C99500] transition-colors">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-base font-semibold tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-[#C99500] hover:text-[#C99500] transition-colors">
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
      className={`h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:border-[#C99500]/60 focus:outline-none focus:ring-2 focus:ring-[#C99500]/20 transition-colors ${className}`}
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
    <div className="flex min-h-[38px] flex-wrap gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 focus-within:border-[#C99500]/60 focus-within:ring-2 focus-within:ring-[#C99500]/20 transition-colors">
      {chips.map((chip) => (
        <span key={chip} className="inline-flex items-center gap-1 rounded-md bg-[#C99500]/15 px-2 py-0.5 text-xs font-medium text-[#C99500]">
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

/* ─── Countdown ──────────────────────────────────────────────────── */
function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calc() {
      const diff = REUNION.checkinDate.getTime() - Date.now();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Mins", value: timeLeft.minutes },
    { label: "Secs", value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-[#C99500]">
            {String(value).padStart(2, "0")}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-[#A07035]">{label}</span>
        </div>
      ))}
    </div>
  );
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
  const [myId, setMyId] = useState<number | null>(null);
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

  // Restore saved identity from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("reunion_family_id");
    if (stored) setMyId(parseInt(stored));
  }, []);

  // Pre-fill form once families load and we know who we are
  useEffect(() => {
    if (!myId || families.length === 0) return;
    const mine = families.find((f) => f.id === myId);
    if (!mine) return;
    setForm({
      family_name: mine.family_name,
      rooms_requested: mine.rooms_requested,
      nights: mine.nights,
      has_pets: mine.has_pets === 1,
      room_type: mine.room_type || "No preference",
      rsvp_status: mine.rsvp_status,
      group_size: parseInt(mine.attendees) || 1,
      phone: mine.phone || "",
      room_number: mine.room_number || "",
      notes: mine.notes || "",
    });
  }, [myId, families]);

  /* Derived stats */
  const totalRooms  = families.reduce((s, f) => s + f.rooms_requested, 0);
  const totalPeople = families.reduce((s, f) => s + (parseInt(f.attendees) || 0), 0);
  const roomPct     = Math.min(100, Math.round((totalRooms / REUNION.targetRooms) * 100));
  const withPets    = families.filter((f) => f.has_pets).length;

  /* Hotel breakdown */
  const hotelBreakdown = REUNION.hotels.map((h) => ({
    hotel: h,
    rooms: families.filter((f) => f.hotel_preference === h).reduce((s, f) => s + f.rooms_requested, 0),
    groups: families.filter((f) => f.hotel_preference === h).length,
  }));

  const payload = {
    ...form,
    contact_name: form.family_name,
    hotel_preference: REUNION.hotels[0],
    attendees: String(form.group_size),
    has_pets: form.has_pets ? 1 : 0,
  };

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.family_name) return;
    setSubmitting(true);

    if (myId) {
      // Update existing entry
      const res = await fetch(`/api/families/${myId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitting(false);
      if (res.ok) {
        const updated = await res.json();
        setFamilies((prev) => prev.map((f) => (f.id === myId ? updated : f)));
        toast.success("Your info has been updated!");
      }
    } else {
      // New entry
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitting(false);
      if (res.ok) {
        const newFamily = await res.json();
        setFamilies((prev) => [...prev, newFamily]);
        localStorage.setItem("reunion_family_id", String(newFamily.id));
        setMyId(newFamily.id);
        toast.success(`${form.family_name} added!`, { description: "You're on the list. See you there!" });
      }
    }
  }

  function handleForgetMe() {
    localStorage.removeItem("reunion_family_id");
    setMyId(null);
    setForm(EMPTY_FORM);
  }

  async function handleDelete(id: number, name: string) {
    await fetch(`/api/families/${id}`, { method: "DELETE" });
    setFamilies((prev) => prev.filter((f) => f.id !== id));
    toast(`${name} removed from the list.`);
  }

  function startEdit(family: Family) {
    setEditingId(family.id);
    setEditForm({ ...family });
    setEditChips([]);
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

      <SiteNav extraRight={
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              Live · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <a
            href="/api/families/export"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-[#C99500]/40 hover:text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        </div>
      } />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-[#C99500]/20 bg-gradient-to-br from-[#3D1204] to-[#2E1503] px-6 py-8 sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#C99500]/8 blur-[80px]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#A07035]">Planning Hub</p>
              <h1 className="mt-1 text-3xl text-[#F7EDD4] sm:text-4xl" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
                {REUNION.name}
              </h1>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-[#B08040]">
                  <CalendarDays className="h-4 w-4 shrink-0 text-[#C99500]" />{REUNION.dates}
                </div>
                <a href={REUNION.mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#B08040] hover:text-[#C99500] transition-colors">
                  <MapPin className="h-4 w-4 shrink-0 text-[#C99500]" />{REUNION.location}
                </a>
                <div className="flex items-center gap-1.5 text-[#A07035]">
                  <Phone className="h-4 w-4 shrink-0 text-[#C99500]" />{REUNION.phone}
                </div>
                <div className="flex items-center gap-1.5 text-[#A07035]">
                  <Clock className="h-4 w-4 shrink-0 text-[#C99500]" />Block cancellation deadline: <span className="text-[#B84A28] font-medium">{REUNION.hotelDeadline}</span>
                </div>
              </div>
              <div className="mt-5">
                <a href={REUNION.bookingUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#C99500] px-4 py-2 text-sm font-medium text-[#2E1503] hover:bg-[#B84A28] hover:text-[#F7EDD4] transition-colors">
                  <ExternalLink className="h-4 w-4" /> Book Your Room
                </a>
              </div>
            </div>
            <div className="flex flex-col items-start gap-4 sm:items-end">
              <Image src="/reunion-crest.webp" alt="Aversa Family Reunion crest" width={100} height={100} className="rounded-full opacity-90" />
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <p className="text-xs uppercase tracking-widest text-[#A07035]">Countdown to Check-in</p>
                <Countdown />
              </div>
            </div>
          </div>
        </div>

        {/* ── Hotel info ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-[#C99500]/20 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base" style={{ fontFamily: "var(--font-playfair)" }}>
                <BedDouble className="h-4 w-4 text-[#C99500]" /> Room Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                <span className="text-muted-foreground">King Room</span>
                <span className="font-semibold text-[#C99500]">$229 / night</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                <span className="text-muted-foreground">Two Queen Room</span>
                <span className="font-semibold text-[#C99500]">$239 / night</span>
              </div>
              <p className="text-xs text-muted-foreground">Rates apply Thu–Sat. Extended stay rates $50–60 less/night. Block of 20 rooms.</p>
            </CardContent>
          </Card>
          <Card className="border-[#8b9b6e]/20 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base" style={{ fontFamily: "var(--font-playfair)" }}>
                <Waves className="h-4 w-4 text-[#8b9b6e]" /> Amenities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><UtensilsCrossed className="h-4 w-4 text-[#8b9b6e]" /> Hot breakfast included</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Waves className="h-4 w-4 text-[#8b9b6e]" /> Indoor pool</div>
              <div className="flex items-center gap-2 text-muted-foreground"><PawPrint className="h-4 w-4 text-amber-400" /> Pet-friendly ($75 one-time fee)</div>
              <a href={REUNION.mapsUrl} target="_blank" rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:border-[#C99500]/40 hover:text-foreground transition-colors">
                <MapPin className="h-3.5 w-3.5 text-[#C99500]" /> Get Directions · ~30 min from EWR
                <ExternalLink className="ml-auto h-3 w-3" />
              </a>
            </CardContent>
          </Card>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="border-[#C99500]/20 bg-card col-span-2 sm:col-span-1">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C99500]/15">
                <BedDouble className="h-5 w-5 text-[#C99500]" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums">{totalRooms}</p>
                <p className="text-sm text-muted-foreground">Rooms</p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-[#C99500] transition-all duration-500" style={{ width: `${roomPct}%` }} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{roomPct}% of {REUNION.targetRooms} target</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#B84A28]/20 bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B84A28]/15">
                <Users className="h-5 w-5 text-[#B84A28]" />
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
                <Badge className="border-[#C99500]/30 bg-[#C99500]/10 text-[#C99500] tabular-nums">
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
                <Card key={family.id} className="border-[#C99500]/30 bg-[#C99500]/5">
                  <CardContent className="space-y-3 p-4">
                    <Input value={editForm.family_name || ""} onChange={(e) => setEditForm((p) => ({ ...p, family_name: e.target.value }))} placeholder="Family name" className="text-sm" />
                    <Input value={editForm.contact_name || ""} onChange={(e) => setEditForm((p) => ({ ...p, contact_name: e.target.value }))} placeholder="Contact name" className="text-sm" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Rooms</Label><Stepper value={editForm.rooms_requested || 1} onChange={(n) => setEditForm((p) => ({ ...p, rooms_requested: n }))} /></div>
                      <div className="space-y-1"><Label className="text-xs">Nights</Label><Stepper value={editForm.nights || 2} onChange={(n) => setEditForm((p) => ({ ...p, nights: n }))} /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Hotel</Label><Select value={editForm.hotel_preference || "No preference"} onChange={(v) => setEditForm((p) => ({ ...p, hotel_preference: v }))} options={HOTELS} /></div>
                    <div className="space-y-1"><Label className="text-xs">Room type</Label><Select value={editForm.room_type || "No preference"} onChange={(v) => setEditForm((p) => ({ ...p, room_type: v }))} options={ROOM_TYPES} /></div>
                    <div className="space-y-1"><Label className="text-xs">RSVP Status</Label><Select value={editForm.rsvp_status || "interested"} onChange={(v) => setEditForm((p) => ({ ...p, rsvp_status: v }))} options={RSVP_STATUSES.map((s) => ({ value: s.value, label: s.label }))} /></div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!editForm.has_pets} onChange={(e) => setEditForm((p) => ({ ...p, has_pets: e.target.checked ? 1 : 0 }))} className="h-4 w-4 accent-[#C99500]" />
                      Bringing pets
                    </label>
                    <div className="space-y-1"><Label className="text-xs">Attendees</Label><AttendeeInput chips={editChips} onAdd={(n) => { if (!editChips.includes(n)) setEditChips((p) => [...p, n]); setEditChipInput(""); }} onRemove={(n) => setEditChips((p) => p.filter((c) => c !== n))} inputVal={editChipInput} onInputChange={setEditChipInput} /></div>
                    <Textarea value={editForm.notes || ""} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes…" rows={2} className="text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-white" onClick={() => saveEdit(family.id)}><Check className="mr-1 h-3.5 w-3.5" />Save</Button>
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
                        </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="border-[#C99500]/30 bg-[#C99500]/10 text-[#C99500]">{family.rooms_requested} {family.rooms_requested === 1 ? "room" : "rooms"}</Badge>
                        <RsvpBadge status={family.rsvp_status} />
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-1.5 text-sm">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                        {family.attendees && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{family.attendees} {Number(family.attendees) === 1 ? "person" : "people"}</span>}
                        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{family.nights} nights</span>
                        {family.room_type && family.room_type !== "No preference" && (
                          <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{family.room_type}</span>
                        )}
                        {family.phone && <a href={`tel:${family.phone}`} className="flex items-center gap-1 hover:text-[#C99500]"><Phone className="h-3.5 w-3.5" />{family.phone}</a>}
                        {family.room_number && <span className="flex items-center gap-1 font-medium text-[#8b9b6e]">Room {family.room_number}</span>}
                      </div>
                      {family.notes && <p className="text-xs text-muted-foreground italic">{family.notes}</p>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => startEdit(family)}><Edit2 className="mr-1 h-3 w-3" />Edit</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#B84A28]" onClick={() => handleDelete(family.id, family.family_name)}><Trash2 className="mr-1 h-3 w-3" />Remove</Button>
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
                    <TableHead className="text-center text-muted-foreground">Group</TableHead>
                    <TableHead className="text-center text-muted-foreground">Rooms</TableHead>
                    <TableHead className="text-center text-muted-foreground">Nights</TableHead>
                    <TableHead className="text-muted-foreground">Room Type</TableHead>
                    <TableHead className="text-muted-foreground">Phone</TableHead>
                    <TableHead className="text-center text-muted-foreground">Room #</TableHead>
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
                      <TableRow key={family.id} className="border-border bg-[#C99500]/5">
                        <TableCell><Input value={editForm.family_name || ""} onChange={(e) => setEditForm((p) => ({ ...p, family_name: e.target.value }))} className="h-7 text-xs" /></TableCell>
                        <TableCell><Select value={editForm.rsvp_status || "interested"} onChange={(v) => setEditForm((p) => ({ ...p, rsvp_status: v }))} options={RSVP_STATUSES.map((s) => ({ value: s.value, label: s.label }))} /></TableCell>
                        <TableCell className="text-center"><Stepper value={parseInt(editForm.attendees || "1") || 1} onChange={(n) => setEditForm((p) => ({ ...p, attendees: String(n) }))} max={30} /></TableCell>
                        <TableCell><Stepper value={editForm.rooms_requested || 1} onChange={(n) => setEditForm((p) => ({ ...p, rooms_requested: n }))} /></TableCell>
                        <TableCell><Stepper value={editForm.nights || 2} onChange={(n) => setEditForm((p) => ({ ...p, nights: n }))} /></TableCell>
                        <TableCell><Select value={editForm.room_type || "No preference"} onChange={(v) => setEditForm((p) => ({ ...p, room_type: v }))} options={ROOM_TYPES} /></TableCell>
                        <TableCell><Input value={editForm.phone || ""} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className="h-7 text-xs" placeholder="555-0100" /></TableCell>
                        <TableCell><Input value={editForm.room_number || ""} onChange={(e) => setEditForm((p) => ({ ...p, room_number: e.target.value }))} className="h-7 text-xs" placeholder="214" /></TableCell>
                        <TableCell><Input value={editForm.notes || ""} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} className="h-7 text-xs" /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 px-2 text-xs bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-white" onClick={() => saveEdit(family.id)}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={family.id} className="border-border hover:bg-muted/30">
                        <TableCell className="font-medium">{family.family_name}</TableCell>
                        <TableCell><RsvpBadge status={family.rsvp_status} /></TableCell>
                        <TableCell className="text-center text-muted-foreground">{family.attendees || <span className="text-border">—</span>}</TableCell>
                        <TableCell className="text-center"><Badge className="border-[#C99500]/30 bg-[#C99500]/10 text-[#C99500]">{family.rooms_requested}</Badge></TableCell>
                        <TableCell className="text-center text-muted-foreground">{family.nights}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{family.room_type && family.room_type !== "No preference" ? family.room_type : <span className="text-border">—</span>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {family.phone ? <a href={`tel:${family.phone}`} className="hover:text-[#C99500] transition-colors">{family.phone}</a> : <span className="text-border">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {family.room_number ? <Badge className="border-[#8b9b6e]/30 bg-[#8b9b6e]/10 text-[#8b9b6e]">{family.room_number}</Badge> : <span className="text-xs text-muted-foreground">TBD</span>}
                        </TableCell>
                        <TableCell className="max-w-[140px] text-sm text-muted-foreground">{family.notes || <span className="text-border">—</span>}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => startEdit(family)}><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#B84A28]" onClick={() => handleDelete(family.id, family.family_name)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
                  {myId ? "Your Info" : "Add Your Family"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {myId ? "Update your details — changes save to the list instantly." : "Fill this in and you'll appear in the list instantly."}
                </p>
              </div>
              {myId && (
                <button onClick={handleForgetMe} className="shrink-0 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                  Not you?
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="family_name">Last Name *</Label>
                <Input id="family_name" required placeholder="e.g. DiNicola" value={form.family_name} onChange={(e) => setForm((p) => ({ ...p, family_name: e.target.value }))} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Room Type</Label>
                  <Select value={form.room_type} onChange={(v) => setForm((p) => ({ ...p, room_type: v }))} options={ROOM_TYPES} />
                </div>
                <div className="space-y-1.5">
                  <Label>RSVP Status</Label>
                  <Select value={form.rsvp_status} onChange={(v) => setForm((p) => ({ ...p, rsvp_status: v }))} options={RSVP_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>How Many in Your Group</Label>
                  <Stepper value={form.group_size} onChange={(n) => setForm((p) => ({ ...p, group_size: n }))} max={30} />
                </div>
                <div className="space-y-2">
                  <Label>Rooms Needed</Label>
                  <Stepper value={form.rooms_requested} onChange={(n) => setForm((p) => ({ ...p, rooms_requested: n }))} />
                </div>
                <div className="space-y-2">
                  <Label>Nights</Label>
                  <Stepper value={form.nights} onChange={(n) => setForm((p) => ({ ...p, nights: n }))} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="phone" type="tel" placeholder="e.g. 732-555-0100" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="room_number">Room Number <span className="text-muted-foreground text-xs">(fill in at check-in)</span></Label>
                  <Input id="room_number" placeholder="e.g. 214" value={form.room_number} onChange={(e) => setForm((p) => ({ ...p, room_number: e.target.value }))} />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 hover:border-[#C99500]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={form.has_pets}
                  onChange={(e) => setForm((p) => ({ ...p, has_pets: e.target.checked }))}
                  className="h-4 w-4 accent-[#C99500]"
                />
                <div>
                  <p className="text-sm font-medium">Bringing pets</p>
                  <p className="text-xs text-muted-foreground">Note: Please confirm pet policy with Hampton Inn directly</p>
                </div>
                <PawPrint className="ml-auto h-4 w-4 text-muted-foreground" />
              </label>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="e.g. need adjoining rooms, dietary needs, mobility considerations…" rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>

              <Button type="submit" disabled={submitting} className="bg-[#C99500] text-[#2E1503] hover:bg-[#B84A28] hover:text-white transition-colors font-medium">
                {submitting ? (myId ? "Saving…" : "Adding…") : (myId ? "Save Changes" : "Add to the List")}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
