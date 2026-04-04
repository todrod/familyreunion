"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Users, BedDouble, CalendarDays, MapPin, Clock, Minus, Plus, X, Edit2, Trash2, Check,
} from "lucide-react";

/* ── Reunion constants — update these as details are confirmed ── */
const REUNION = {
  name: "Family Reunion 2026",
  dates: "TBD — Summer 2026",
  location: "Tinton Falls, NJ",
  hotelDeadline: "TBD",
  hotels: ["Radisson in Freehold", "Colts Neck Hotel", "The Hawthorne"],
  targetRooms: 25,
};

interface Family {
  id: number;
  family_name: string;
  contact_name: string;
  rooms_requested: number;
  nights: number;
  attendees: string;
  notes: string;
  created_at: string;
}

const EMPTY_FORM = {
  family_name: "",
  contact_name: "",
  rooms_requested: 1,
  nights: 3,
  attendees: [] as string[],
  attendee_input: "",
  notes: "",
};

/* ── Stepper ── */
function Stepper({
  value, min = 1, max = 20, onChange,
}: { value: number; min?: number; max?: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-[#d4a853] hover:text-[#d4a853] transition-colors"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-base font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-[#d4a853] hover:text-[#d4a853] transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Attendee chip input ── */
function AttendeeInput({
  chips, onAdd, onRemove, inputVal, onInputChange,
}: {
  chips: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  inputVal: string;
  onInputChange: (v: string) => void;
}) {
  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const name = inputVal.trim().replace(/,$/, "");
      if (name && !chips.includes(name)) onAdd(name);
    }
    if (e.key === "Backspace" && !inputVal && chips.length) {
      onRemove(chips[chips.length - 1]);
    }
  }

  function handleBlur() {
    const name = inputVal.trim().replace(/,$/, "");
    if (name && !chips.includes(name)) onAdd(name);
  }

  return (
    <div className="flex min-h-[38px] flex-wrap gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 focus-within:border-[#d4a853]/60 focus-within:ring-2 focus-within:ring-[#d4a853]/20 transition-colors">
      {chips.map((chip) => (
        <span
          key={chip}
          className="inline-flex items-center gap-1 rounded-md bg-[#d4a853]/15 px-2 py-0.5 text-xs font-medium text-[#d4a853]"
        >
          {chip}
          <button type="button" onClick={() => onRemove(chip)} className="opacity-60 hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
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

/* ── Countdown ── */
function Countdown() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    // Placeholder until actual date is set
    setDays(null);
  }, []);

  if (days === null) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-[#a0886a]">
        <Clock className="h-4 w-4" />
        <span>Date TBD — check back soon</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-[#d4a853]">
      <Clock className="h-4 w-4" />
      <span><strong>{days}</strong> days to go</span>
    </div>
  );
}

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
    if (res.ok) {
      const data = await res.json();
      setFamilies(data);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    fetchFamilies();
    intervalRef.current = setInterval(fetchFamilies, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchFamilies]);

  const totalRooms = families.reduce((s, f) => s + f.rooms_requested, 0);
  const totalPeople = families.reduce((s, f) => s + f.attendees.split(",").filter(Boolean).length, 0);
  const roomPct = Math.min(100, Math.round((totalRooms / REUNION.targetRooms) * 100));

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.family_name || !form.contact_name) return;
    setSubmitting(true);
    const res = await fetch("/api/families", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        family_name: form.family_name,
        contact_name: form.contact_name,
        rooms_requested: form.rooms_requested,
        nights: form.nights,
        attendees: form.attendees.join(", "),
        notes: form.notes,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      const newFamily = await res.json();
      setFamilies((prev) => [...prev, newFamily]);
      setForm(EMPTY_FORM);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/families/${id}`, { method: "DELETE" });
    setFamilies((prev) => prev.filter((f) => f.id !== id));
  }

  function startEdit(family: Family) {
    setEditingId(family.id);
    setEditForm({ ...family });
    setEditChips(family.attendees.split(",").map((s) => s.trim()).filter(Boolean));
    setEditChipInput("");
  }

  async function saveEdit(id: number) {
    const payload = { ...editForm, attendees: editChips.join(", ") };
    const res = await fetch(`/api/families/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setFamilies((prev) => prev.map((f) => (f.id === id ? updated : f)));
      setEditingId(null);
    }
  }

  function addChip(name: string) {
    setForm((p) => ({ ...p, attendees: [...p.attendees, name], attendee_input: "" }));
  }
  function removeChip(name: string) {
    setForm((p) => ({ ...p, attendees: p.attendees.filter((a) => a !== name) }));
  }

  function addEditChip(name: string) {
    if (!editChips.includes(name)) setEditChips((p) => [...p, name]);
    setEditChipInput("");
  }
  function removeEditChip(name: string) {
    setEditChips((p) => p.filter((c) => c !== name));
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav bar ── */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4a853]/15 text-[#d4a853]">
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
                <path d="M10 2C6.5 2 4 4.5 4 7.5c0 2.5 1.5 4.5 3.5 5.5V16l2.5-1.5L12.5 16v-3C14.5 12 16 10 16 7.5 16 4.5 13.5 2 10 2Z" stroke="#d4a853" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <span className="font-heading text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-playfair)" }}>
                Family Reunion
              </span>
              <span className="ml-1.5 text-xs text-muted-foreground">· Rodriguez · Aversa</span>
            </div>
          </div>
          {lastUpdated && (
            <span className="hidden text-xs text-muted-foreground sm:block">
              Live · {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-[#d4a853]/20 bg-gradient-to-br from-[#261a0c] to-[#1c1208] px-6 py-8 sm:px-10 sm:py-10">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#d4a853]/8 blur-[80px]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.2em] text-[#a0886a]">Planning Hub</p>
            <h1
              className="mt-1 text-3xl text-[#f5ede0] sm:text-4xl"
              style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
            >
              {REUNION.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-[#c4a97d]">
                <CalendarDays className="h-4 w-4 text-[#d4a853]" />
                {REUNION.dates}
              </div>
              <div className="flex items-center gap-1.5 text-[#c4a97d]">
                <MapPin className="h-4 w-4 text-[#d4a853]" />
                {REUNION.location}
              </div>
              <Countdown />
            </div>

            {REUNION.hotelDeadline !== "TBD" && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#c8553d]/30 bg-[#c8553d]/10 px-3 py-1.5 text-xs text-[#e08070]">
                <Clock className="h-3.5 w-3.5" />
                Hotel block deadline: <strong>{REUNION.hotelDeadline}</strong>
              </div>
            )}

            {/* Hotels */}
            <div className="mt-5 flex flex-wrap gap-2">
              {REUNION.hotels.map((h) => (
                <span key={h} className="rounded-full border border-[#d4a853]/25 bg-[#d4a853]/10 px-3 py-1 text-xs text-[#c4a97d]">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-[#d4a853]/20 bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d4a853]/15">
                <BedDouble className="h-5 w-5 text-[#d4a853]" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold tabular-nums text-foreground">{totalRooms}</p>
                <p className="text-sm text-muted-foreground">Rooms requested</p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-[#d4a853] transition-all duration-500"
                    style={{ width: `${roomPct}%` }}
                  />
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
                <p className="text-2xl font-bold tabular-nums text-foreground">{families.length}</p>
                <p className="text-sm text-muted-foreground">Family groups</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{totalPeople} people listed so far</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#8b9b6e]/20 bg-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8b9b6e]/15">
                <CalendarDays className="h-5 w-5 text-[#8b9b6e]" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {families.length > 0
                    ? Math.round(families.reduce((s, f) => s + f.nights, 0) / families.length)
                    : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg. nights</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Across all groups</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Attendee list ── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold" style={{ fontFamily: "var(--font-playfair)" }}>
                Who&apos;s Coming
              </h2>
              <p className="text-sm text-muted-foreground">Updates live every 5 seconds</p>
            </div>
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
                    <Input
                      value={editForm.family_name || ""}
                      onChange={(e) => setEditForm((p) => ({ ...p, family_name: e.target.value }))}
                      placeholder="Family name"
                      className="text-sm"
                    />
                    <Input
                      value={editForm.contact_name || ""}
                      onChange={(e) => setEditForm((p) => ({ ...p, contact_name: e.target.value }))}
                      placeholder="Contact name"
                      className="text-sm"
                    />
                    <div className="flex gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Rooms</Label>
                        <Stepper
                          value={editForm.rooms_requested || 1}
                          onChange={(n) => setEditForm((p) => ({ ...p, rooms_requested: n }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nights</Label>
                        <Stepper
                          value={editForm.nights || 3}
                          onChange={(n) => setEditForm((p) => ({ ...p, nights: n }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Attendees</Label>
                      <AttendeeInput
                        chips={editChips}
                        onAdd={addEditChip}
                        onRemove={removeEditChip}
                        inputVal={editChipInput}
                        onInputChange={setEditChipInput}
                      />
                    </div>
                    <Textarea
                      value={editForm.notes || ""}
                      onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Notes…"
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-[#d4a853] text-[#1c1208] hover:bg-[#c8553d] hover:text-white" onClick={() => saveEdit(family.id)}>
                        <Check className="mr-1 h-3.5 w-3.5" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card key={family.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{family.family_name}</p>
                        <p className="text-xs text-muted-foreground">Contact: {family.contact_name}</p>
                      </div>
                      <Badge className="shrink-0 border-[#d4a853]/30 bg-[#d4a853]/10 text-[#d4a853]">
                        {family.rooms_requested} {family.rooms_requested === 1 ? "room" : "rooms"}
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{family.nights} nights</span>
                      </div>
                      {family.attendees && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {family.attendees.split(",").map((n) => n.trim()).filter(Boolean).map((n) => (
                            <span key={n} className="rounded-md bg-[#d4a853]/10 px-1.5 py-0.5 text-xs text-[#d4a853]">{n}</span>
                          ))}
                        </div>
                      )}
                      {family.notes && (
                        <p className="text-xs text-muted-foreground italic">{family.notes}</p>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => startEdit(family)}>
                        <Edit2 className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[#c8553d] hover:text-[#c8553d]" onClick={() => handleDelete(family.id)}>
                        <Trash2 className="mr-1 h-3 w-3" /> Remove
                      </Button>
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
                    <TableHead className="text-muted-foreground">Family / Branch</TableHead>
                    <TableHead className="text-muted-foreground">Contact</TableHead>
                    <TableHead className="text-center text-muted-foreground">Rooms</TableHead>
                    <TableHead className="text-center text-muted-foreground">Nights</TableHead>
                    <TableHead className="text-muted-foreground">Attendees</TableHead>
                    <TableHead className="text-muted-foreground">Notes</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {families.length === 0 && (
                    <TableRow className="border-border">
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                        No entries yet — add your family below!
                      </TableCell>
                    </TableRow>
                  )}
                  {families.map((family) =>
                    editingId === family.id ? (
                      <TableRow key={family.id} className="border-border bg-[#d4a853]/5">
                        <TableCell>
                          <Input value={editForm.family_name || ""} onChange={(e) => setEditForm((p) => ({ ...p, family_name: e.target.value }))} className="h-7 text-xs" />
                        </TableCell>
                        <TableCell>
                          <Input value={editForm.contact_name || ""} onChange={(e) => setEditForm((p) => ({ ...p, contact_name: e.target.value }))} className="h-7 text-xs" />
                        </TableCell>
                        <TableCell>
                          <Stepper value={editForm.rooms_requested || 1} onChange={(n) => setEditForm((p) => ({ ...p, rooms_requested: n }))} />
                        </TableCell>
                        <TableCell>
                          <Stepper value={editForm.nights || 3} onChange={(n) => setEditForm((p) => ({ ...p, nights: n }))} />
                        </TableCell>
                        <TableCell>
                          <AttendeeInput chips={editChips} onAdd={addEditChip} onRemove={removeEditChip} inputVal={editChipInput} onInputChange={setEditChipInput} />
                        </TableCell>
                        <TableCell>
                          <Input value={editForm.notes || ""} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} className="h-7 text-xs" />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 px-2 text-xs bg-[#d4a853] text-[#1c1208] hover:bg-[#c8553d] hover:text-white" onClick={() => saveEdit(family.id)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={family.id} className="border-border hover:bg-muted/30">
                        <TableCell className="font-medium">{family.family_name}</TableCell>
                        <TableCell className="text-muted-foreground">{family.contact_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="border-[#d4a853]/30 bg-[#d4a853]/10 text-[#d4a853]">{family.rooms_requested}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{family.nights}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {family.attendees
                              ? family.attendees.split(",").map((n) => n.trim()).filter(Boolean).map((n) => (
                                  <span key={n} className="rounded-md bg-[#d4a853]/10 px-1.5 py-0.5 text-xs text-[#d4a853]">{n}</span>
                                ))
                              : <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[160px] text-sm text-muted-foreground">{family.notes || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => startEdit(family)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[#c8553d] hover:text-[#c8553d]" onClick={() => handleDelete(family.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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
            <CardTitle className="font-heading text-lg" style={{ fontFamily: "var(--font-playfair)" }}>
              Add Your Family
            </CardTitle>
            <p className="text-sm text-muted-foreground">Fill this in and you&apos;ll appear in the list instantly.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="family_name">Family Branch / Name *</Label>
                  <Input
                    id="family_name"
                    required
                    placeholder="e.g. DiNicola — Southern"
                    value={form.family_name}
                    onChange={(e) => setForm((p) => ({ ...p, family_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_name">Your Name *</Label>
                  <Input
                    id="contact_name"
                    required
                    placeholder="e.g. Carol"
                    value={form.contact_name}
                    onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rooms Needed</Label>
                  <Stepper
                    value={form.rooms_requested}
                    onChange={(n) => setForm((p) => ({ ...p, rooms_requested: n }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nights</Label>
                  <Stepper
                    value={form.nights}
                    onChange={(n) => setForm((p) => ({ ...p, nights: n }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Who&apos;s Coming</Label>
                <AttendeeInput
                  chips={form.attendees}
                  onAdd={addChip}
                  onRemove={removeChip}
                  inputVal={form.attendee_input}
                  onInputChange={(v) => setForm((p) => ({ ...p, attendee_input: v }))}
                />
                <p className="text-xs text-muted-foreground">Type each name and press Enter or comma to add.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. no pets, need adjoining rooms, any dietary needs…"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#d4a853] text-[#1c1208] hover:bg-[#c8553d] hover:text-white transition-colors font-medium"
              >
                {submitting ? "Adding…" : "Add to the List"}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
