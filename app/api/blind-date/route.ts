import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import {
  genreCatalog,
  readingModes,
  type BookLength,
  type LocalReadingData,
  type OpenLibraryBook,
  type ReadingFormat,
  type ReadingMode,
} from "@/app/lib/reader-data";
import { searchOpenLibrary } from "@/app/lib/open-library";

export const runtime = "nodejs";

const validFormats: ReadingFormat[] = ["Any format", "Print", "Ebook", "Audiobook"];
const validLengths: BookLength[] = [
  "Any length",
  "Short (<250 pages)",
  "Medium (250-450 pages)",
  "Long (450+ pages)",
];
const hourlyLimit = 3;
const requestTimes = new Map<string, number[]>();

function text(value: unknown, max = 80): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeReadingList(value: unknown): LocalReadingData["tbr"] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const title = text(record.title, 180);
    if (!title) return [];
    return [
      {
        title,
        author: text(record.author, 120) || undefined,
        subjects: Array.isArray(record.subjects)
          ? record.subjects
              .filter((subject): subject is string => typeof subject === "string")
              .slice(0, 12)
          : [],
      },
    ];
  });
}

function allowedLength(book: OpenLibraryBook, length: BookLength): boolean {
  if (length === "Any length" || !book.pageCount) return true;
  if (length === "Short (<250 pages)") return book.pageCount < 250;
  if (length === "Medium (250-450 pages)") return book.pageCount >= 250 && book.pageCount <= 450;
  return book.pageCount > 450;
}

function genreQuery(genres: string[]): string {
  if (!genres.length) return "fiction OR romance OR fantasy OR mystery OR thriller OR horror";
  const terms = genres.slice(0, 12).flatMap((name) => {
    const known = genreCatalog.find((genre) => genre.name.toLowerCase() === name.toLowerCase());
    if (known) return known.field ? [`${known.field}:${known.query}`] : known.terms.slice(0, 3);
    const safe = name
      .replace(/[^a-zA-Z0-9 -]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join(" ");
    return safe ? [safe] : [];
  });
  return terms.length
    ? [...new Set(terms)].join(" OR ")
    : "fiction OR romance OR fantasy OR mystery OR thriller OR horror";
}

function chooseRandom<T>(items: T[]): T | null {
  return items.length ? items[Math.floor(Math.random() * items.length)] : null;
}

function spiceFit(book: OpenLibraryBook, desired: number): number {
  const subjects = book.subjects.join(" ").toLowerCase();
  const low = /clean|closed door|fade to black|sweet romance/.test(subjects);
  const high = /explicit|erotic|steamy|spicy|dark romance/.test(subjects);
  if (desired <= 1) return high ? -8 : low ? 4 : 1;
  if (desired >= 4) return low ? -4 : high ? 4 : 1;
  return high || low ? 0 : 2;
}

function withinRateLimit(key: string): boolean {
  const now = Date.now();
  const current = (requestTimes.get(key) ?? []).filter((time) => now - time < 60 * 60 * 1000);
  if (current.length >= hourlyLimit) return false;
  current.push(now);
  requestTimes.set(key, current);
  if (requestTimes.size > 500) {
    for (const [entryKey, times] of requestTimes) {
      if (!times.some((time) => now - time < 60 * 60 * 1000)) requestTimes.delete(entryKey);
    }
  }
  return true;
}

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.BLIND_DATE_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json(
      { error: "Blind Date is not connected yet. Please try again later." },
      { status: 503 },
    );
  }
  try {
    const parsedWebhook = new URL(webhookUrl);
    if (parsedWebhook.protocol !== "https:") throw new Error("Blind Date webhook must use HTTPS.");
  } catch {
    console.error("BLIND_DATE_WEBHOOK_URL must be a valid HTTPS URL");
    return Response.json({ error: "Blind Date is temporarily unavailable." }, { status: 503 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const requester = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  if (!withinRateLimit(requester)) {
    return Response.json(
      { error: "Please wait a little before requesting another blind date." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Invalid request.");
    body = value as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: "Your blind-date preferences could not be read." },
      { status: 400 },
    );
  }

  const mode = body.mode as ReadingMode;
  if (!readingModes.some((item) => item.name === mode)) {
    return Response.json({ error: "Choose a valid reading mood." }, { status: 400 });
  }
  const preferencesValue =
    body.preferences && typeof body.preferences === "object"
      ? (body.preferences as Record<string, unknown>)
      : {};
  const format = preferencesValue.format as ReadingFormat;
  const length = preferencesValue.length as BookLength;
  const spiceLevel = Number(preferencesValue.spiceLevel);
  if (
    !validFormats.includes(format) ||
    !validLengths.includes(length) ||
    !Number.isInteger(spiceLevel) ||
    spiceLevel < 0 ||
    spiceLevel > 5
  ) {
    return Response.json(
      { error: "Check your format, length, and spice preferences." },
      { status: 400 },
    );
  }
  if (body.consent !== true) {
    return Response.json(
      { error: "Please confirm the organizer may receive your hidden book choice." },
      { status: 400 },
    );
  }

  const contactValue =
    body.contact && typeof body.contact === "object"
      ? (body.contact as Record<string, unknown>)
      : {};
  const contactName = text(contactValue.name, 100);
  const contactEmail = text(contactValue.email, 200).toLowerCase();
  const fulfillmentValue =
    body.fulfillment && typeof body.fulfillment === "object"
      ? (body.fulfillment as Record<string, unknown>)
      : {};
  const fulfillmentMethod =
    fulfillmentValue.method === "ship to me"
      ? "ship to me"
      : fulfillmentValue.method === "club pickup"
        ? "club pickup"
        : null;
  const shippingAddress =
    fulfillmentMethod === "ship to me" ? text(fulfillmentValue.address, 500) : "";
  if (
    !contactName ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ||
    !fulfillmentMethod ||
    (fulfillmentMethod === "ship to me" && !shippingAddress)
  ) {
    return Response.json(
      { error: "Add your name, a valid email, and any delivery details needed for your surprise." },
      { status: 400 },
    );
  }

  const genres = Array.isArray(body.genres)
    ? body.genres
        .filter((genre): genre is string => typeof genre === "string")
        .map((genre) => genre.slice(0, 80))
    : [];
  const source = body.source === "tbr" || body.source === "open-library" ? body.source : "all";
  const tbr = normalizeReadingList(body.tbr);
  const query = text(body.query, 120);
  let selected: OpenLibraryBook | null = null;

  try {
    const candidates: OpenLibraryBook[] = [];
    if (source !== "open-library" && tbr.length) {
      const tbrCandidates = tbr
        .filter((book) => {
          const searchable =
            `${book.title} ${book.author ?? ""} ${book.subjects.join(" ")}`.toLowerCase();
          const pageSubject = book.subjects.find((subject) => subject.startsWith("pages:"));
          const lengthMatch =
            !pageSubject ||
            allowedLength(
              {
                key: "",
                title: book.title,
                authors: [],
                subjects: book.subjects,
                pageCount: Number(pageSubject.slice(6)),
              },
              length,
            );
          const genreMatch =
            !genres.length ||
            genres.some((genre) => {
              const known = genreCatalog.find(
                (item) => item.name.toLowerCase() === genre.toLowerCase(),
              );
              const terms = known?.terms ?? [genre.toLowerCase()];
              return terms.some((term) => searchable.includes(term.toLowerCase()));
            });
          return lengthMatch && genreMatch;
        })
        .map((book, index): OpenLibraryBook => ({
          key: `tbr:${book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${index}`,
          title: book.title,
          authors: book.author ? [book.author] : [],
          subjects: book.subjects,
          source: "tbr",
        }));
      candidates.push(...tbrCandidates);
    }

    if (!selected && source !== "tbr") {
      const search = await searchOpenLibrary(
        [genreQuery(genres), query].filter(Boolean).join(" "),
        0,
        50,
      );
      candidates.push(...search.items.filter((book) => allowedLength(book, length)));
    }
    const deduplicated = [
      ...new Map(
        candidates.map((book) => [
          `${book.title.toLowerCase()}|${book.authors[0]?.toLowerCase() ?? ""}`,
          book,
        ]),
      ).values(),
    ];
    const spiceRanked = deduplicated
      .map((book) => ({ book, fit: spiceFit(book, spiceLevel) }))
      .sort((a, b) => b.fit - a.fit);
    const eligible = spiceRanked
      .filter((item) => item.fit >= 0)
      .slice(0, 20)
      .map((item) => item.book);
    selected = chooseRandom(eligible.length ? eligible : deduplicated);
    if (!selected) {
      return Response.json(
        { error: "No books matched those preferences. Widen the genre or length and try again." },
        { status: 404 },
      );
    }

    const requestId = randomUUID();
    const organizerPayload = {
      type: "blind-date-book-request",
      requestId,
      createdAt: new Date().toISOString(),
      selection: {
        key: selected.key,
        title: selected.title,
        authors: selected.authors,
        firstPublished: selected.firstPublished,
        pageCount: selected.pageCount,
        coverUrl: selected.coverUrl,
        source: selected.source ?? "open-library",
      },
      preferences: { mode, genres, readingFormat: format, bookLength: length, spiceLevel, source },
      recipient: {
        name: contactName,
        email: contactEmail,
        fulfillment: fulfillmentMethod,
        shippingAddress: shippingAddress || undefined,
      },
    };
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(organizerPayload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Organizer webhook returned ${response.status}`);

    return Response.json(
      {
        accepted: true,
        requestId,
        message: "Your blind date is sealed. The organizer has received your preferences.",
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Blind Date request delivery failed", error);
    return Response.json(
      { error: "We couldn’t send your sealed pick to the organizer. Please try again later." },
      { status: 502 },
    );
  }
}
