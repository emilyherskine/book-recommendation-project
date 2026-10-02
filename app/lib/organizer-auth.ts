import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "gloaming_organizer";
export const SESSION_SECONDS = 8 * 60 * 60;

function secret(): string | null {
  const password = process.env.ORGANIZER_PASSWORD;
  return password ? `${process.env.ORGANIZER_SESSION_SECRET ?? ""}${password}` : null;
}

function digest(value: string, key: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

export function isOrganizerConfigured(): boolean {
  return secret() !== null;
}

export function passwordMatches(input: string): boolean {
  const password = process.env.ORGANIZER_PASSWORD;
  if (!password) return false;
  return timingSafeEqual(digest(input, "password-check"), digest(password, "password-check"));
}

export function createSessionToken(now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("ORGANIZER_PASSWORD is not set.");
  const expires = String(Math.floor(now / 1000) + SESSION_SECONDS);
  return `${expires}.${digest(expires, key).toString("hex")}`;
}

export function isValidSessionToken(token: string | undefined, now = Date.now()): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) * 1000 < now) return false;
  const expected = Buffer.from(digest(expires, key).toString("hex"));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isOrganizerRequest(request: NextRequest): boolean {
  return isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}
