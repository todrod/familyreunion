import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifySession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { family_name, contact_name, rooms_requested, nights, hotel_preference, has_pets, room_type, rsvp_status, attendees, phone, room_number, notes } = body;

  await pool.query(
    `UPDATE families SET family_name=?, contact_name=?, rooms_requested=?, nights=?,
     hotel_preference=?, has_pets=?, room_type=?, rsvp_status=?, attendees=?, phone=?, room_number=?, notes=? WHERE id=?`,
    [
      family_name, contact_name, Number(rooms_requested), Number(nights),
      hotel_preference || "", has_pets ? 1 : 0, room_type || "",
      rsvp_status || "interested", attendees, phone || "", room_number || "", notes, id,
    ]
  );

  const [rows] = await pool.query("SELECT * FROM families WHERE id = ?", [id]);
  return NextResponse.json((rows as unknown[])[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifySession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await pool.query("DELETE FROM families WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
