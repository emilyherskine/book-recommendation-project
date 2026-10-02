// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/app/lib/open-library", () => ({ searchOpenLibrary: vi.fn() }));
vi.mock("@/app/lib/request-store", () => ({
  isStoreConfigured: vi.fn(() => false),
  saveRequest: vi.fn(),
}));
vi.mock("@/app/lib/developer-email", () => ({
  emailDeveloper: vi.fn(),
  isDeveloperEmailConfigured: vi.fn(() => false),
}));

import { emailDeveloper, isDeveloperEmailConfigured } from "@/app/lib/developer-email";

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

  it("emails the developer directly when Gmail is configured", async () => {
    vi.stubEnv("BLIND_DATE_WEBHOOK_URL", "");
    vi.mocked(isDeveloperEmailConfigured).mockReturnValueOnce(true);
    const response = await post(validBody());
    expect(response.status).toBe(202);
    expect(emailDeveloper).toHaveBeenCalledWith({
      subject: expect.stringContaining("Reader"),
      text: expect.stringContaining("Book: Secret Title"),
    });
  });
});

describe("POST /api/blind-date preferences", () => {
  it("chooses a book that fits the reader's length preference", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const body = {
      ...validBody(),
      tbr: [
        { title: "Doorstopper", subjects: [], pageCount: 900 },
        { title: "Novella", subjects: [], pageCount: 150 },
      ],
      preferences: { format: "Any format", length: "Short (<250 pages)", spiceLevel: 2 },
    };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      fetchMock.mockClear();
      await post(body);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).selection.title).toBe("Novella");
    }
  });

  it("rejects out-of-range spice levels", async () => {
    const body = {
      ...validBody(),
      preferences: { format: "Print", length: "Any length", spiceLevel: 0 },
    };
    expect((await post(body)).status).toBe(400);
  });
});

describe("POST /api/blind-date genres and heat", () => {
  it("picks the book that matches genre, length, and spice together", async () => {
    const { searchOpenLibrary } = await import("@/app/lib/open-library");
    vi.mocked(searchOpenLibrary).mockResolvedValue({
      items: [
        {
          key: "/works/1",
          title: "Wrong Heat",
          authors: [],
          subjects: ["gothic", "erotica"],
          pageCount: 200,
        },
        { key: "/works/2", title: "Too Long", authors: [], subjects: ["gothic"], pageCount: 800 },
        {
          key: "/works/3",
          title: "Just Right",
          authors: [],
          subjects: ["gothic", "mystery"],
          pageCount: 220,
        },
        { key: "/works/4", title: "Off Genre", authors: [], subjects: ["cookery"], pageCount: 210 },
      ],
      total: 4,
      offset: 0,
      limit: 50,
      hasMore: false,
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const body = {
      ...validBody(),
      source: "open-library",
      genres: ["gothic"],
      preferences: { format: "Any format", length: "Short (<250 pages)", spiceLevel: 1 },
    };
    await post(body);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.selection.title).toBe("Just Right");
    expect(sent.selection.preferenceMatch).toContain("Matches your genre: gothic");
  });
});

describe("POST /api/blind-date in-house storage", () => {
  it("saves the request for the organizer room without needing a webhook", async () => {
    const store = await import("@/app/lib/request-store");
    vi.mocked(store.isStoreConfigured).mockReturnValue(true);
    vi.stubEnv("BLIND_DATE_WEBHOOK_URL", "");
    const response = await post(validBody());
    expect(response.status).toBe(202);
    expect(await response.text()).not.toContain("Secret Title");
    expect(store.saveRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "new",
        selection: expect.objectContaining({ title: "Secret Title" }),
      }),
    );
    vi.mocked(store.isStoreConfigured).mockReturnValue(false);
  });
});
