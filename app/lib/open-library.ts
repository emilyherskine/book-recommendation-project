import type { OpenLibraryBook } from "@/app/lib/reader-data";

const SEARCH_FIELDS = [
  "key",
  "title",
  "author_name",
  "first_publish_year",
  "cover_i",
  "edition_count",
  "number_of_pages_median",
  "subject",
  "first_sentence",
].join(",");

type SearchDocument = {
  key?: unknown;
  title?: unknown;
  author_name?: unknown;
  first_publish_year?: unknown;
  cover_i?: unknown;
  edition_count?: unknown;
  number_of_pages_median?: unknown;
  subject?: unknown;
  first_sentence?: unknown;
};

type SearchResponse = {
  docs?: SearchDocument[];
  num_found?: number;
  numFound?: number;
  start?: number;
};

export type OpenLibrarySearchPage = {
  items: OpenLibraryBook[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeDocument(document: SearchDocument): OpenLibraryBook | null {
  const key = asString(document.key);
  const title = asString(document.title);
  if (!key || !title || !key.startsWith("/works/")) return null;

  const coverId = asNumber(document.cover_i);
  const firstSentence = Array.isArray(document.first_sentence)
    ? asString(document.first_sentence[0])
    : asString(document.first_sentence);

  return {
    key,
    title,
    authors: asStringList(document.author_name),
    firstPublished: asNumber(document.first_publish_year),
    coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined,
    editionCount: asNumber(document.edition_count),
    pageCount: asNumber(document.number_of_pages_median),
    subjects: asStringList(document.subject).slice(0, 6),
    firstSentence,
  };
}

export async function searchOpenLibrary(
  query: string,
  offset: number,
  limit: number,
): Promise<OpenLibrarySearchPage> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("fields", SEARCH_FIELDS);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url, {
    headers: { "User-Agent": "GloamingShelf/1.0 (book discovery)" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new Error(`Open Library returned ${response.status}`);
  }

  const payload = (await response.json()) as SearchResponse;
  const items = (payload.docs ?? [])
    .map(normalizeDocument)
    .filter((book): book is OpenLibraryBook => book !== null);
  const total = payload.num_found ?? payload.numFound ?? 0;

  return { items, total, offset, limit, hasMore: offset + items.length < total };
}
