import { promises as fs } from "node:fs";
import path from "node:path";

export type BlindDateRecord = {
  type: "blind-date-book-request";
  requestId: string;
  createdAt: string;
  status: "new" | "fulfilled";
  selection: {
    key: string;
    title: string;
    authors: string[];
    firstPublished?: number;
    pageCount?: number;
    coverUrl?: string;
    source: string;
    preferenceMatch: string[];
  };
  preferences: {
    mode: string;
    genres: string[];
    readingFormat: string;
    bookLength: string;
    spiceLevel: number;
    source: string;
  };
  recipient: {
    name: string;
    email: string;
    fulfillment: string;
    shippingAddress?: string;
  };
};

const HASH_KEY = "gloaming:blind-date-requests";

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/** Production needs Redis; local development falls back to a JSON file. */
export function isStoreConfigured(): boolean {
  return Boolean(redisConfig()) || process.env.NODE_ENV !== "production";
}

async function redis(command: string[]): Promise<unknown> {
  const config = redisConfig();
  if (!config) throw new Error("Redis is not configured.");
  const response = await fetch(config.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (!response.ok || payload.error) throw new Error(payload.error ?? `Redis ${response.status}`);
  return payload.result;
}

function dataFile(): string {
  return path.join(process.env.BLIND_DATE_DATA_DIR ?? ".data", "blind-dates.json");
}

async function readFileStore(): Promise<Record<string, BlindDateRecord>> {
  try {
    return JSON.parse(await fs.readFile(dataFile(), "utf8")) as Record<string, BlindDateRecord>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function writeFileStore(records: Record<string, BlindDateRecord>): Promise<void> {
  await fs.mkdir(path.dirname(dataFile()), { recursive: true });
  await fs.writeFile(dataFile(), JSON.stringify(records, null, 2), { mode: 0o600 });
}

export async function saveRequest(record: BlindDateRecord): Promise<void> {
  if (redisConfig()) {
    await redis(["HSET", HASH_KEY, record.requestId, JSON.stringify(record)]);
    return;
  }
  const records = await readFileStore();
  records[record.requestId] = record;
  await writeFileStore(records);
}

export async function listRequests(): Promise<BlindDateRecord[]> {
  let records: BlindDateRecord[];
  if (redisConfig()) {
    const flat = ((await redis(["HGETALL", HASH_KEY])) as string[] | null) ?? [];
    records = flat.filter((_, index) => index % 2 === 1).map((value) => JSON.parse(value));
  } else {
    records = Object.values(await readFileStore());
  }
  return records.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function updateRequestStatus(
  requestId: string,
  status: BlindDateRecord["status"],
): Promise<boolean> {
  if (redisConfig()) {
    const current = (await redis(["HGET", HASH_KEY, requestId])) as string | null;
    if (!current) return false;
    const record = { ...(JSON.parse(current) as BlindDateRecord), status };
    await redis(["HSET", HASH_KEY, requestId, JSON.stringify(record)]);
    return true;
  }
  const records = await readFileStore();
  if (!records[requestId]) return false;
  records[requestId] = { ...records[requestId], status };
  await writeFileStore(records);
  return true;
}
