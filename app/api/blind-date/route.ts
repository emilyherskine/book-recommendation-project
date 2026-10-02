import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import {
  genreCatalog,
  modeSearchTerms,
  readingModes,
  validFormats,
  validLengths,
  type BookLength,
  type LocalReadingData,
  type OpenLibraryBook,
  type ReadingFormat,
  type ReadingMode,
} from "@/app/lib/reader-data";
import { searchOpenLibrary } from "@/app/lib/open-library";
import { preferredPool, scoreForPreferences } from "@/app/lib/preferences";
import { isStoreConfigured, saveRequest } from "@/app/lib/request-store";

export const runtime = "nodejs";

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
        pageCount:
          typeof record.pageCount === "number" && record.pageCount > 0 && record.pageCount < 10000
            ? Math.round(record.pageCount)
            : undefined,
        formats: Array.isArray(record.formats)
          ? validFormats.filter((format) => (record.formats as unknown[]).includes(format))
          : undefined,
      },
    ];
  });
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

function themeFit(
  book: OpenLibraryBook,
  genres: string[],
  mode: ReadingMode,
  query: string,
): { score: number; reasons: string[] } {
  const text = [book.title, ...book.authors, ...book.subjects].join(" ").toLowerCase();
  const matchedGenres = genres.filter((genre) => {
    const known = genreCatalog.find((item) => item.name.toLowerCase() === genre.toLowerCase());
    return (known?.terms ?? [genre]).some((term) => text.includes(term.toLowerCase()));
  });
  const words = (value: string) =>
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2);
  const moodHits = words(modeSearchTerms[mode]).filter((word) => text.includes(word));
  const queryHits = words(query).filter((word) => text.includes(word));
  return {
    score: matchedGenres.length * 5 + moodHits.length * 2 + queryHits.length * 4,
    reasons: [
      ...matchedGenres.map((genre) => `Matches your genre: ${genre}`),
      ...moodHits.slice(0, 2).map((word) => `Suits your ${mode.toLowerCase()} mood: ${word}`),
      ...queryHits.slice(0, 2).map((word) => `Matches your search: ${word}`),
    ],
  };
}

function chooseRandom<T>(items: T[]): T | null {
  return items.length ? items[Math.floor(Math.random() * items.length)] : null;
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

function validWebhook(value: string | undefined): string | null {
  if (!value) return null;
  try {
    if (new URL(value).protocol === "https:") return value;
  } catch {
    // Falls through to the warning below.
  }
  console.error("BLIND_DATE_WEBHOOK_URL must be a valid HTTPS URL; ignoring it.");
  return null;
}

export async function POST(request: NextRequest) {
  const webhookUrl = validWebhook(process.env.BLIND_DATE_WEBHOOK_URL);
  const storing = isStoreConfigured();
  if (!webhookUrl && !storing) {
    return Response.json(
      { error: "Blind Date is not connected yet. Please try again later." },
      { status: 503 },
    );
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
    spiceLevel < 1 ||
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
          const genreMatch =
            !genres.length ||
            genres.some((genre) => {
              const known = genreCatalog.find(
                (item) => item.name.toLowerCase() === genre.toLowerCase(),
              );
              const terms = known?.terms ?? [genre.toLowerCase()];
              return terms.some((term) => searchable.includes(term.toLowerCase()));
            });
          return genreMatch;
        })
        .map((book, index): OpenLibraryBook => ({
          key: `tbr:${book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${index}`,
          title: book.title,
          authors: book.author ? [book.author] : [],
          subjects: book.subjects,
          pageCount: book.pageCount,
          formats: book.formats,
          source: "tbr",
        }));
      candidates.push(...tbrCandidates);
    }

    if (!selected && source !== "tbr") {
      const baseQuery = genreQuery(genres);
      let search = await searchOpenLibrary(
        query ? `(${baseQuery}) AND ${query}` : baseQuery,
        0,
        50,
      );
      if (!search.items.length && query) search = await searchOpenLibrary(baseQuery, 0, 50);
      candidates.push(...search.items);
    }
    const deduplicated = [
      ...new Map(
        candidates.map((book) => [
          `${book.title.toLowerCase()}|${book.authors[0]?.toLowerCase() ?? ""}`,
          book,
        ]),
      ).values(),
    ];
    const preferences = { format, length, spiceLevel };
    const scored = deduplicated.map((book) => {
      const fit = scoreForPreferences(book, preferences);
      const theme = themeFit(book, genres, mode, query);
      return {
        book,
        fit: {
          ...fit,
          score: fit.score + theme.score,
          reasons: [...theme.reasons, ...fit.reasons],
        },
      };
    });
    const ranked = preferredPool(scored, (item) => item.fit).sort(
      (a, b) => b.fit.score - a.fit.score,
    );
    // Only near-best matches stay in the draw, so genre and preferences always steer the pick.
    const eligible = ranked.filter((item) => item.fit.score >= ranked[0].fit.score - 4);
    const choice = chooseRandom(eligible);
    selected = choice?.book ?? null;
    const preferenceMatch = choice?.fit.reasons ?? [];
    if (!selected) {
      return Response.json(
        { error: "No books matched those preferences. Widen the genre or length and try again." },
        { status: 404 },
      );
    }

    const requestId = randomUUID();
    const organizerPayload = {
      type: "blind-date-book-request" as const,
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
        preferenceMatch,
      },
      preferences: { mode, genres, readingFormat: format, bookLength: length, spiceLevel, source },
      recipient: {
        name: contactName,
        email: contactEmail,
        fulfillment: fulfillmentMethod,
        shippingAddress: shippingAddress || undefined,
      },
    };
    if (storing) await saveRequest({ ...organizerPayload, status: "new" });
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(organizerPayload),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`Organizer webhook returned ${response.status}`);
      } catch (error) {
        // A saved request still reaches the organizer dashboard.
        if (!storing) throw error;
        console.error("Organizer webhook failed", error);
      }
    }

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
