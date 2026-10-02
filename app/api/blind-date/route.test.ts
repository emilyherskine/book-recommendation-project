// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/app/lib/open-library", () => ({ searchOpenLibrary: vi.fn() }));

let ip = 0;
const validBody = () => ({
  mode: "Comfort",
  source: "tbr",
  genres: [],
  tbr: [{ title: "Secret Title", author: "A. Writer", subjects: [] }],
  preferences: { format: "Print", length: "Any length", spiceLevel: 2 },
  contact: { name: "Reader", email: "reader@example.com" },
  fulfillment: { method: "club pickup" },
  consent: true,
});
const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/blind-date", {
      method: "POST",
      headers: { "x-forwarded-for": `10.0.0.${(ip += 1)}` },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.stubEnv("BLIND_DATE_WEBHOOK_URL", "https://hooks.example.com/blind");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/blind-date", () => {
  it("returns 503 when the webhook is not configured", async () => {
    vi.stubEnv("BLIND_DATE_WEBHOOK_URL", "");
    expect((await post(validBody())).status).toBe(503);
  });

  it("requires consent", async () => {
    expect((await post({ ...validBody(), consent: false })).status).toBe(400);
  });

  it("requires a shipping address when shipping", async () => {
    const body = { ...validBody(), fulfillment: { method: "ship to me" } };
    expect((await post(body)).status).toBe(400);
  });

  it("sends the hidden title to the organizer but never to the reader", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const response = await post(validBody());
    const text = await response.text();

    expect(response.status).toBe(202);
    expect(text).not.toContain("Secret Title");
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.selection.title).toBe("Secret Title");
    expect(sent.recipient.email).toBe("reader@example.com");
  });

  it("returns 502 when the webhook fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    expect((await post(validBody())).status).toBe(502);
  });
});
