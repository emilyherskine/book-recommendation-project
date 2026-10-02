import { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_SECONDS,
  createSessionToken,
  isOrganizerConfigured,
  passwordMatches,
} from "@/app/lib/organizer-auth";

export const runtime = "nodejs";

const attempts = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  attempts.set(key, [...recent, now]);
  return recent.length >= MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  if (!isOrganizerConfigured()) {
    return Response.json({ error: "The organizer room is not set up yet." }, { status: 503 });
  }
  const requester = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooManyAttempts(requester)) {
    return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "Enter the organizer password." }, { status: 400 });
  }
  if (!passwordMatches(password)) {
    return Response.json({ error: "That password isn’t right." }, { status: 401 });
  }
  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    [
      `${SESSION_COOKIE}=${createSessionToken()}`,
      "Path=/api/organizer",
      `Max-Age=${SESSION_SECONDS}`,
      "HttpOnly",
      "SameSite=Strict",
      ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
    ].join("; "),
  );
  return response;
}
