// @vitest-environment node
import { afterEach, beforeEach, vi } from "vitest";
import {
  SESSION_SECONDS,
  createSessionToken,
  isOrganizerConfigured,
  isValidSessionToken,
  passwordMatches,
} from "./organizer-auth";

beforeEach(() => vi.stubEnv("ORGANIZER_PASSWORD", "moonlight"));
afterEach(() => vi.unstubAllEnvs());

describe("organizer auth", () => {
  it("checks the password", () => {
    expect(isOrganizerConfigured()).toBe(true);
    expect(passwordMatches("moonlight")).toBe(true);
    expect(passwordMatches("sunlight")).toBe(false);
  });

  it("accepts a fresh session token and rejects tampered or expired ones", () => {
    const now = Date.now();
    const token = createSessionToken(now);
    expect(isValidSessionToken(token, now)).toBe(true);
    expect(isValidSessionToken(token, now + (SESSION_SECONDS + 5) * 1000)).toBe(false);
    expect(isValidSessionToken(`${token}0`, now)).toBe(false);
    expect(isValidSessionToken("1.abc", now)).toBe(false);
    expect(isValidSessionToken(undefined, now)).toBe(false);
  });

  it("invalidates tokens when the password changes", () => {
    const token = createSessionToken();
    vi.stubEnv("ORGANIZER_PASSWORD", "other");
    expect(isValidSessionToken(token)).toBe(false);
  });

  it("is disabled without a password", () => {
    vi.stubEnv("ORGANIZER_PASSWORD", "");
    expect(isOrganizerConfigured()).toBe(false);
    expect(passwordMatches("")).toBe(false);
  });
});
