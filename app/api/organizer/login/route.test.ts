// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, vi } from "vitest";
import { POST } from "./route";

let ip = 0;
const login = (body: unknown, address = `10.1.0.${(ip += 1)}`) =>
  POST(
    new NextRequest("http://localhost/api/organizer/login", {
      method: "POST",
      headers: { "x-forwarded-for": address },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => vi.stubEnv("ORGANIZER_PASSWORD", "moonlight"));
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/organizer/login", () => {
  it("sets an httpOnly session cookie for the right password", async () => {
    const response = await login({ password: "moonlight" });
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("gloaming_organizer=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
  });

  it("rejects a wrong password", async () => {
    expect((await login({ password: "nope" })).status).toBe(401);
  });

  it("locks out repeated guesses", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) await login({ password: "x" }, "9.9.9.9");
    expect((await login({ password: "moonlight" }, "9.9.9.9")).status).toBe(429);
  });

  it("returns 503 when no password is configured", async () => {
    vi.stubEnv("ORGANIZER_PASSWORD", "");
    expect((await login({ password: "x" })).status).toBe(503);
  });
});
