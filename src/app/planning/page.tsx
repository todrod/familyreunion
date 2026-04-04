"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  rooms_requested: "1",
  nights: "3",
  attendees: "",
  notes: "",
};

export default function PlanningPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Family>>({});
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
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchFamilies]);

  const totalRooms = families.reduce((sum, f) => sum + f.rooms_requested, 0);
  const totalPeople = families.reduce((sum, f) => {
    const names = f.attendees.split(",").filter(Boolean);
    return sum + names.length;
  }, 0);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/families", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        rooms_requested: Number(form.rooms_requested),
        nights: Number(form.nights),
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
  }

  async function saveEdit(id: number) {
    const res = await fetch(`/api/families/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setFamilies((prev) => prev.map((f) => (f.id === id ? updated : f)));
      setEditingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Badge className="mb-2 border-amber-300/35 bg-amber-500/15 text-amber-100">
            Planning
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">Room & Attendance Tracker</h1>
          <p className="text-sm text-zinc-400">
            Real-time. Updates every 5 seconds.
            {lastUpdated && (
              <span className="ml-2 text-zinc-500">
                Last sync: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        {/* Summary badges */}
        <div className="flex gap-3">
          <div className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-amber-400">{totalRooms}</p>
            <p className="text-xs text-zinc-400">Total Rooms</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-cyan-400">{families.length}</p>
            <p className="text-xs text-zinc-400">Family Groups</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-center">
            <p className="text-2xl font-bold text-green-400">{totalPeople}</p>
            <p className="text-xs text-zinc-400">People Listed</p>
          </div>
        </div>
      </div>

      {/* Live Table */}
      <Card className="border-white/10 bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attendee List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Family / Branch</TableHead>
                  <TableHead className="text-zinc-400">Contact</TableHead>
                  <TableHead className="text-center text-zinc-400">Rooms</TableHead>
                  <TableHead className="text-center text-zinc-400">Nights</TableHead>
                  <TableHead className="text-zinc-400">Attendees</TableHead>
                  <TableHead className="text-zinc-400">Notes</TableHead>
                  <TableHead className="text-zinc-400"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {families.length === 0 && (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={7} className="py-10 text-center text-zinc-500">
                      No entries yet. Add the first one below.
                    </TableCell>
                  </TableRow>
                )}
                {families.map((family) =>
                  editingId === family.id ? (
                    <TableRow key={family.id} className="border-white/10 bg-zinc-800/50">
                      <TableCell>
                        <Input
                          value={editForm.family_name || ""}
                          onChange={(e) => setEditForm((p) => ({ ...p, family_name: e.target.value }))}
                          className="h-7 border-white/10 bg-zinc-700 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.contact_name || ""}
                          onChange={(e) => setEditForm((p) => ({ ...p, contact_name: e.target.value }))}
                          className="h-7 border-white/10 bg-zinc-700 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={editForm.rooms_requested || 1}
                          onChange={(e) => setEditForm((p) => ({ ...p, rooms_requested: Number(e.target.value) }))}
                          className="h-7 w-16 border-white/10 bg-zinc-700 text-center text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={editForm.nights || 3}
                          onChange={(e) => setEditForm((p) => ({ ...p, nights: Number(e.target.value) }))}
                          className="h-7 w-16 border-white/10 bg-zinc-700 text-center text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.attendees || ""}
                          onChange={(e) => setEditForm((p) => ({ ...p, attendees: e.target.value }))}
                          className="h-7 border-white/10 bg-zinc-700 text-xs"
                          placeholder="comma separated"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.notes || ""}
                          onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                          className="h-7 border-white/10 bg-zinc-700 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveEdit(family.id)}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={family.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium">{family.family_name}</TableCell>
                      <TableCell className="text-zinc-300">{family.contact_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="border-amber-300/30 bg-amber-500/15 text-amber-200">
                          {family.rooms_requested}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-zinc-300">{family.nights}</TableCell>
                      <TableCell className="max-w-[200px] text-sm text-zinc-300">
                        {family.attendees
                          ? family.attendees.split(",").map((name) => name.trim()).filter(Boolean).map((name) => (
                              <span key={name} className="mr-1 inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-xs">
                                {name}
                              </span>
                            ))
                          : <span className="text-zinc-500">—</span>}
                      </TableCell>
                      <TableCell className="max-w-[180px] text-sm text-zinc-400">
                        {family.notes || <span className="text-zinc-600">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-zinc-400 hover:text-white"
                            onClick={() => startEdit(family)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                            onClick={() => handleDelete(family.id)}
                          >
                            ✕
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Intake Form */}
      <Card className="border-white/10 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base">Add Family Group</CardTitle>
          <p className="text-sm text-zinc-400">Fill in your info and it will appear in the table instantly.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="family_name">Family / Branch Name *</Label>
              <Input
                id="family_name"
                required
                placeholder="e.g. DiNicola — Southern"
                value={form.family_name}
                onChange={(e) => setForm((p) => ({ ...p, family_name: e.target.value }))}
                className="border-white/10 bg-zinc-800"
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
                className="border-white/10 bg-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rooms_requested">Rooms Needed</Label>
              <Input
                id="rooms_requested"
                type="number"
                min={1}
                value={form.rooms_requested}
                onChange={(e) => setForm((p) => ({ ...p, rooms_requested: e.target.value }))}
                className="border-white/10 bg-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nights">Nights</Label>
              <Input
                id="nights"
                type="number"
                min={1}
                value={form.nights}
                onChange={(e) => setForm((p) => ({ ...p, nights: e.target.value }))}
                className="border-white/10 bg-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attendees">Who&apos;s Coming (comma separated)</Label>
              <Input
                id="attendees"
                placeholder="e.g. Carol, Freddy, Justin"
                value={form.attendees}
                onChange={(e) => setForm((p) => ({ ...p, attendees: e.target.value }))}
                className="border-white/10 bg-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="e.g. no pets, adjoining rooms"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="border-white/10 bg-zinc-800"
              />
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={submitting} className="bg-amber-500 text-black hover:bg-amber-400">
                {submitting ? "Adding…" : "Add to List"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
