import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET() {
  if (!await verifySession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rows] = await pool.query("SELECT * FROM families ORDER BY family_name ASC") as [Record<string, unknown>[], unknown];

  const headers = [
    "Family / Branch", "Contact", "RSVP Status", "Hotel Preference",
    "Rooms", "Nights", "Room Type", "Pets", "Attendees", "Notes", "Submitted",
  ];

  const STATUS_LABELS: Record<string, string> = {
    interested: "Interested",
    confirmed: "Confirmed",
    deposit: "Deposit Paid",
  };

  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csvRows = [
    headers.join(","),
    ...rows.map((r) => [
      escape(r.family_name),
      escape(r.contact_name),
      escape(STATUS_LABELS[r.rsvp_status as string] ?? r.rsvp_status),
      escape(r.hotel_preference || "No preference"),
      escape(r.rooms_requested),
      escape(r.nights),
      escape(r.room_type || "No preference"),
      escape(r.has_pets ? "Yes" : "No"),
      escape(r.attendees),
      escape(r.notes),
      escape(new Date(r.created_at as string).toLocaleDateString()),
    ].join(",")),
  ].join("\n");

  return new NextResponse(csvRows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="family-reunion-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
