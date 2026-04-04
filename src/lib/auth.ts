import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "fallback-secret"
);
const COOKIE_NAME = "reunion_session";
const PASSWORD = "Aversa";

export async function createSession() {
  const token = await new SignJWT({ auth: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
  return token;
}

export async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function checkPassword(input: string): Promise<boolean> {
  return input === PASSWORD;
}

export { COOKIE_NAME };
