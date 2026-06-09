"use client";

import { useState, useEffect } from "react";
import { SiteNav } from "@/components/site-nav";
import {
  MapPin, Phone, Clock, Utensils, Waves, TreePine, Star, Heart,
  ExternalLink, Pencil, Plus, X, Check,
  CalendarDays, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Icon system (serialisable) ────────────────────────────────────────────────
const ICON_OPTIONS = [
  { key: "utensils",  label: "Food / Meal",   icon: <Utensils  className="h-4 w-4" /> },
  { key: "waves",     label: "Pool / Water",  icon: <Waves     className="h-4 w-4" /> },
  { key: "tree",      label: "Outdoors",      icon: <TreePine  className="h-4 w-4" /> },
  { key: "star",      label: "Special",       icon: <Star      className="h-4 w-4" /> },
  { key: "heart",     label: "Family",        icon: <Heart     className="h-4 w-4" /> },
  { key: "calendar",  label: "General",       icon: <CalendarDays className="h-4 w-4" /> },
] as const;
type IconKey = typeof ICON_OPTIONS[number]["key"];

function EventIcon({ iconKey, className = "h-4 w-4" }: { iconKey: IconKey; className?: string }) {
  const found = ICON_OPTIONS.find(o => o.key === iconKey);
  if (!found) return <CalendarDays className={className} />;
  return <>{found.icon}</>;
}

// ── Data types ────────────────────────────────────────────────────────────────
interface ScheduleEvent {
  id: string;
  iconKey: IconKey;
  time: string;
  title: string;
  description: string;
  location: string;
  locationUrl: string;
  phone: string;
  highlight: boolean;
}
interface Day {
  key: string;
  emoji: string;
  short: string;
  full: string;
  date: string;
  summary: string;
}
interface ScheduleData {
  days: Day[];
  events: Record<string, ScheduleEvent[]>;
}

// ── Default data ──────────────────────────────────────────────────────────────
const DEFAULT_DATA: ScheduleData = {
  days: [
    { key: "thu", emoji: "🏨", short: "Thu", full: "Thursday", date: "July 16", summary: "Early arrivals & check-in" },
    { key: "fri", emoji: "👋", short: "Fri", full: "Friday",   date: "July 17", summary: "Welcome & gathering" },
    { key: "sat", emoji: "🎉", short: "Sat", full: "Saturday", date: "July 18", summary: "Pool · BBQ · Dinner & Games" },
    { key: "sun", emoji: "💛", short: "Sun", full: "Sunday",   date: "July 19", summary: "Farewell & safe travels" },
  ],
  events: {
    thu: [
      { id: "thu1", iconKey: "waves",    time: "",               title: "Early Check-In",         description: "For those arriving a day early — get settled in and rest up for the weekend ahead.", location: "Hampton Inn Old Bridge · 300 Spring Valley Rd, Old Bridge, NJ 08857", locationUrl: "https://maps.google.com/?q=Hampton+Inn+Old+Bridge+300+Spring+Valley+Rd+Old+Bridge+NJ", phone: "732-851-0300", highlight: false },
    ],
    fri: [
      { id: "fri1", iconKey: "utensils", time: "6:00 AM – 10:00 AM", title: "Complimentary Breakfast",  description: "Start your day with a hot complimentary breakfast at the hotel.", location: "Hampton Inn — Dining Area", locationUrl: "", phone: "", highlight: false },
      { id: "fri2", iconKey: "heart",    time: "3:30 PM – 7:30 PM",  title: "Welcome Reception",        description: "Tom and Angela have rented the board room for a welcome gathering with light refreshments. Tom & Angela will greet everyone as they check in.", location: "Hampton Inn — Board Room", locationUrl: "", phone: "", highlight: true },
      { id: "fri3", iconKey: "star",     time: "3:30 PM – 7:30 PM",  title: "Aversa Books & Name Tags", description: "Diane will be distributing the Aversa family books and name tags — don't miss picking yours up!", location: "Hampton Inn — Board Room", locationUrl: "", phone: "", highlight: false },
    ],
    sat: [
      { id: "sat1", iconKey: "utensils", time: "6:00 AM – 10:00 AM", title: "Complimentary Breakfast",           description: "Fuel up — it's a big day!", location: "Hampton Inn — Dining Area", locationUrl: "", phone: "", highlight: false },
      { id: "sat2", iconKey: "waves",    time: "10:00 AM",            title: "Indoor Pool Party",                 description: "Immediately following breakfast, head to the indoor pool for fun in the water. Bring your suits!", location: "Hampton Inn — Indoor Pool", locationUrl: "", phone: "", highlight: true },
      { id: "sat3", iconKey: "tree",     time: "12:30 PM",            title: "BBQ at Cheesequake State Park",     description: "Head over to the park for a family BBQ and games in the great outdoors.", location: "Cheesequake State Park — Spring Hill Picnic Area · 300 Gordon Rd, Matawan, NJ 07747", locationUrl: "https://maps.google.com/?q=Cheesequake+State+Park+300+Gordon+Rd+Matawan+NJ", phone: "", highlight: true },
      { id: "sat4", iconKey: "utensils", time: "Evening",             title: "Dinner at Butchie's of Brooklyn",   description: "Family dinner together at a great local spot.", location: "Butchie's of Brooklyn · 430 US-9 N, Marlboro, NJ", locationUrl: "https://maps.google.com/?q=430+US-9+N+Marlboro+NJ", phone: "", highlight: true },
      { id: "sat5", iconKey: "star",     time: "After Dinner",        title: "Family Games Night",                description: "Aversa Family Trivia · Aversa Family Bingo · The Aversa Song · Aversa Awards", location: "", locationUrl: "", phone: "", highlight: false },
    ],
    sun: [
      { id: "sun1", iconKey: "utensils", time: "6:00 AM – 10:00 AM", title: "Farewell Breakfast",    description: "One last meal together before everyone heads home.", location: "Hampton Inn — Dining Area", locationUrl: "", phone: "", highlight: false },
      { id: "sun2", iconKey: "heart",    time: "After Breakfast",     title: "Check-Out & Safe Travels", description: "Until we meet again — safe journey home. So lucky to have the family that we do. 💛", location: "", locationUrl: "", phone: "", highlight: true },
    ],
  },
};

const LS_KEY = "reunion_schedule_v2";
function uid() { return Math.random().toString(36).slice(2, 9); }

const BLANK_EVENT: Omit<ScheduleEvent, "id"> = {
  iconKey: "calendar", time: "", title: "", description: "",
  location: "", locationUrl: "", phone: "", highlight: false,
};
const BLANK_DAY: Omit<Day, "key"> = {
  emoji: "📅", short: "", full: "", date: "", summary: "",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [data, setData] = useState<ScheduleData>(DEFAULT_DATA);
  const [activeDay, setActiveDay] = useState("fri");
  const [editing, setEditing] = useState(false);

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<Omit<ScheduleEvent, "id">>({ ...BLANK_EVENT });

  // Day form
  const [showDayForm, setShowDayForm] = useState(false);
  const [dayForm, setDayForm] = useState<Omit<Day, "key">>({ ...BLANK_DAY });

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ScheduleData;
        if (parsed.days && parsed.events) setData(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  function save(next: ScheduleData) {
    setData(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }

  // ── Event CRUD ───────────────────────────────────────────────────────────────
  function openAddEvent() {
    setEditingEventId(null);
    setEventForm({ ...BLANK_EVENT });
    setShowEventForm(true);
  }

  function openEditEvent(ev: ScheduleEvent) {
    setEditingEventId(ev.id);
    setEventForm({ iconKey: ev.iconKey, time: ev.time, title: ev.title, description: ev.description, location: ev.location, locationUrl: ev.locationUrl, phone: ev.phone, highlight: ev.highlight });
    setShowEventForm(true);
  }

  function saveEvent() {
    if (!eventForm.title.trim()) return;
    const next = { ...data };
    if (!next.events[activeDay]) next.events[activeDay] = [];
    if (editingEventId) {
      next.events[activeDay] = next.events[activeDay].map(e =>
        e.id === editingEventId ? { ...eventForm, id: editingEventId } : e
      );
    } else {
      next.events[activeDay] = [...next.events[activeDay], { ...eventForm, id: uid() }];
    }
    save(next);
    setShowEventForm(false);
  }

  function deleteEvent(id: string) {
    const next = { ...data, events: { ...data.events, [activeDay]: data.events[activeDay].filter(e => e.id !== id) } };
    save(next);
  }

  // ── Day CRUD ─────────────────────────────────────────────────────────────────
  function saveDay() {
    if (!dayForm.full.trim() || !dayForm.date.trim()) return;
    const key = uid();
    const next: ScheduleData = {
      days: [...data.days, { ...dayForm, key }],
      events: { ...data.events, [key]: [] },
    };
    save(next);
    setActiveDay(key);
    setShowDayForm(false);
    setDayForm({ ...BLANK_DAY });
  }

  function deleteDay(key: string) {
    if (data.days.length <= 1) return;
    const next: ScheduleData = {
      days: data.days.filter(d => d.key !== key),
      events: Object.fromEntries(Object.entries(data.events).filter(([k]) => k !== key)),
    };
    if (activeDay === key) setActiveDay(next.days[0].key);
    save(next);
  }

  const dayEvents = data.events[activeDay] ?? [];
  const currentDay = data.days.find(d => d.key === activeDay);
  const idx = data.days.findIndex(d => d.key === activeDay);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl text-foreground" style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}>
              Schedule of Events
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">14th Aversa Family Reunion · July 16–19, 2026</p>
          </div>
          <Button
            variant={editing ? "default" : "outline"}
            size="sm"
            onClick={() => { setEditing(v => !v); setShowEventForm(false); setShowDayForm(false); }}
            className={editing ? "gap-1.5 bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-white" : "gap-1.5"}
          >
            {editing ? <><Check className="h-3.5 w-3.5" /> Done</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
          </Button>
        </div>


        {/* Day overview grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.days.map(day => (
            <div key={day.key} className="relative">
              <button onClick={() => setActiveDay(day.key)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${activeDay === day.key ? "border-[#c28e2b]/50 bg-[#c28e2b]/10 shadow-sm" : "border-border bg-card hover:border-[#c28e2b]/30 hover:bg-[#c28e2b]/5"}`}>
                <p className="text-2xl mb-2">{day.emoji}</p>
                <p className={`text-xs font-bold uppercase tracking-wider ${activeDay === day.key ? "text-[#c28e2b]" : "text-muted-foreground"}`}>
                  {day.short} · {day.date}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground leading-tight">{day.summary}</p>
              </button>
              {editing && (
                <button onClick={() => deleteDay(day.key)}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#bf5a33] text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
                  title="Remove day">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {editing && (
            <button onClick={() => { setShowDayForm(true); setShowEventForm(false); }}
              className="rounded-2xl border-2 border-dashed border-border p-4 text-center text-muted-foreground hover:border-[#c28e2b]/40 hover:text-foreground transition-colors flex flex-col items-center justify-center gap-2 min-h-[110px]">
              <Plus className="h-5 w-5" />
              <span className="text-xs font-medium">Add Day</span>
            </button>
          )}
        </div>

        {/* Add day form */}
        {editing && showDayForm && (
          <div className="rounded-2xl border border-[#c28e2b]/30 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Add New Day</h3>
              <button onClick={() => setShowDayForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Emoji</label>
                <input value={dayForm.emoji} onChange={e => setDayForm(v => ({ ...v, emoji: e.target.value }))} placeholder="📅" className={inputCls} maxLength={2} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Short label (e.g. Mon)</label>
                <input value={dayForm.short} onChange={e => setDayForm(v => ({ ...v, short: e.target.value }))} placeholder="Mon" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Full name</label>
                <input value={dayForm.full} onChange={e => setDayForm(v => ({ ...v, full: e.target.value }))} placeholder="Monday" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input value={dayForm.date} onChange={e => setDayForm(v => ({ ...v, date: e.target.value }))} placeholder="July 20" className={inputCls} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Summary</label>
                <input value={dayForm.summary} onChange={e => setDayForm(v => ({ ...v, summary: e.target.value }))} placeholder="Brief description of the day" className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveDay} size="sm" className="bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-white gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add Day
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDayForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Day heading */}
        {currentDay && (
          <div>
            <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-playfair)" }}>
              {currentDay.full}, {currentDay.date}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">{currentDay.summary}</p>

            {/* Timeline */}
            <div className="relative space-y-4">
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

              {dayEvents.map(event => (
                <div key={event.id} className="flex gap-4">
                  <div className={`relative z-10 mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${event.highlight ? "border-[#c28e2b] bg-[#c28e2b]/15 text-[#c28e2b]" : "border-border bg-card text-muted-foreground"}`}>
                    <EventIcon iconKey={event.iconKey} />
                  </div>
                  <div className={`flex-1 rounded-2xl border px-5 py-4 space-y-1.5 relative ${event.highlight ? "border-[#c28e2b]/30 bg-[#c28e2b]/5" : "border-border bg-card"}`}>
                    {editing && (
                      <div className="absolute top-3 right-3 flex gap-1.5">
                        <button onClick={() => openEditEvent(event)}
                          className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button onClick={() => deleteEvent(event.id)}
                          className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-[#bf5a33] transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {event.time && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Clock className="h-3 w-3" />{event.time}
                      </div>
                    )}
                    <p className="text-base font-semibold text-foreground pr-16">{event.title}</p>
                    {event.description && <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>}
                    {event.location && (
                      event.locationUrl ? (
                        <a href={event.locationUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#c28e2b] hover:underline">
                          <MapPin className="h-3 w-3 shrink-0" />{event.location}<ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />{event.location}
                        </p>
                      )
                    )}
                    {event.phone && (
                      <a href={`tel:${event.phone.replace(/\D/g, "")}`}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#c28e2b] transition-colors">
                        <Phone className="h-3 w-3 shrink-0" />{event.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {/* Add event button */}
              {editing && (
                <div className="flex gap-4">
                  <div className="relative z-10 mt-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#c28e2b]/40 bg-transparent text-[#c28e2b]">
                    <Plus className="h-4 w-4" />
                  </div>
                  <button onClick={() => { openAddEvent(); setShowDayForm(false); }}
                    className="flex-1 mt-3 rounded-2xl border-2 border-dashed border-border px-5 py-4 text-left text-sm text-muted-foreground hover:border-[#c28e2b]/40 hover:text-foreground transition-colors flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add event to {currentDay.full}
                  </button>
                </div>
              )}
            </div>

            {/* Event form */}
            {editing && showEventForm && (
              <div className="mt-4 rounded-2xl border border-[#c28e2b]/30 bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {editingEventId ? "Edit Event" : "Add Event"}
                  </h3>
                  <button onClick={() => setShowEventForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Time */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Time / Time Range</label>
                    <input value={eventForm.time} onChange={e => setEventForm(v => ({ ...v, time: e.target.value }))}
                      placeholder="e.g. 3:00 PM – 5:00 PM or Evening" className={inputCls} />
                  </div>
                  {/* Icon */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Icon</label>
                    <select value={eventForm.iconKey} onChange={e => setEventForm(v => ({ ...v, iconKey: e.target.value as IconKey }))}
                      className={inputCls}>
                      {ICON_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                  </div>
                  {/* Highlight */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={eventForm.highlight}
                        onChange={e => setEventForm(v => ({ ...v, highlight: e.target.checked }))}
                        className="h-4 w-4 rounded" />
                      <span className="text-xs font-medium text-muted-foreground">Highlight (gold)</span>
                    </label>
                  </div>
                  {/* Title */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Title *</label>
                    <input value={eventForm.title} onChange={e => setEventForm(v => ({ ...v, title: e.target.value }))}
                      placeholder="Event name" className={inputCls} />
                  </div>
                  {/* Description */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <textarea value={eventForm.description} onChange={e => setEventForm(v => ({ ...v, description: e.target.value }))}
                      placeholder="Additional details…" rows={2} className={inputCls + " resize-none"} />
                  </div>
                  {/* Location */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Location</label>
                    <input value={eventForm.location} onChange={e => setEventForm(v => ({ ...v, location: e.target.value }))}
                      placeholder="Venue name and address" className={inputCls} />
                  </div>
                  {/* Map URL */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Google Maps Link (optional)</label>
                    <input value={eventForm.locationUrl} onChange={e => setEventForm(v => ({ ...v, locationUrl: e.target.value }))}
                      placeholder="https://maps.google.com/…" className={inputCls} />
                  </div>
                  {/* Phone */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Phone (optional)</label>
                    <input value={eventForm.phone} onChange={e => setEventForm(v => ({ ...v, phone: e.target.value }))}
                      placeholder="555-123-4567" className={inputCls} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveEvent} size="sm"
                    disabled={!eventForm.title.trim()}
                    className="bg-[#c28e2b] text-[#14321f] hover:bg-[#bf5a33] hover:text-white gap-1.5">
                    <Check className="h-3.5 w-3.5" /> {editingEventId ? "Save Changes" : "Add Event"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowEventForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Day nav */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {idx > 0 ? (
            <button onClick={() => setActiveDay(data.days[idx - 1].key)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-[#c28e2b]/40 hover:text-foreground transition-colors">
              ← {data.days[idx - 1].short} · {data.days[idx - 1].date}
            </button>
          ) : <div />}
          {idx < data.days.length - 1 ? (
            <button onClick={() => setActiveDay(data.days[idx + 1].key)}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-[#c28e2b]/40 hover:text-foreground transition-colors">
              {data.days[idx + 1].short} · {data.days[idx + 1].date} →
            </button>
          ) : <div />}
        </div>

      </div>
    </div>
  );
}

const inputCls = "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#c28e2b]/60 focus:outline-none focus:ring-2 focus:ring-[#c28e2b]/20 transition-colors";
