// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, vi } from "vitest";
import {
  isStoreConfigured,
  listRequests,
  saveRequest,
  updateRequestStatus,
  type BlindDateRecord,
} from "./request-store";

const record = (requestId: string, createdAt: string): BlindDateRecord => ({
  type: "blind-date-book-request",
  requestId,
  createdAt,
  status: "new",
  selection: { key: "k", title: "Secret", authors: [], source: "tbr", preferenceMatch: [] },
  preferences: {
    mode: "Comfort",
    genres: [],
    readingFormat: "Any format",
    bookLength: "Any length",
    spiceLevel: 2,
    source: "all",
  },
  recipient: { name: "Reader", email: "r@example.com", fulfillment: "club pickup" },
});

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "gloaming-"));
  vi.stubEnv("BLIND_DATE_DATA_DIR", dir);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
});

describe("request store (file)", () => {
  it("saves, lists newest first, and updates status", async () => {
    await saveRequest(record("a", "2026-01-01T00:00:00Z"));
    await saveRequest(record("b", "2026-02-01T00:00:00Z"));
    expect((await listRequests()).map((item) => item.requestId)).toEqual(["b", "a"]);
    expect(await updateRequestStatus("a", "fulfilled")).toBe(true);
    expect((await listRequests())[1].status).toBe("fulfilled");
    expect(await updateRequestStatus("missing", "fulfilled")).toBe(false);
  });

  it("starts empty", async () => {
    expect(await listRequests()).toEqual([]);
  });
});

describe("request store (redis)", () => {
  it("talks to the Upstash REST API when configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: 1 }) });
    vi.stubGlobal("fetch", fetchMock);
    await saveRequest(record("a", "2026-01-01T00:00:00Z"));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).slice(0, 3)).toEqual([
      "HSET",
      "gloaming:blind-date-requests",
      "a",
    ]);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer token");
  });

  it("requires Redis in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isStoreConfigured()).toBe(false);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    expect(isStoreConfigured()).toBe(true);
  });
});
