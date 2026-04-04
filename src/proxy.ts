import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fallback-secret"
);

const PROTECTED = ["/planning"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("reunion_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/", request.url));

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: ["/planning/:path*"],
};
