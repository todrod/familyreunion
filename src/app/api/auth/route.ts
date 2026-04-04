import { NextRequest, NextResponse } from "next/server";
import { checkPassword, createSession, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!await checkPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
