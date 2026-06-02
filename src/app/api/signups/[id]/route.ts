import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { ensureSignupSchema } from "@/lib/signups";

// Public — anyone can remove a contribution (low-stakes family use; the UI only
// offers removal for items you added on this device).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await ensureSignupSchema();
  const { id } = await params;
  await pool.query("DELETE FROM signup_contributions WHERE id = ?", [Number(id)]);
  return NextResponse.json({ ok: true });
}
