import type { ReadingHistoryEntry } from "@/app/lib/reader-data";

export type Enrichment = { subjects: string[]; pageCount?: number };

const keyOf = (title: string) => title.trim().toLowerCase();

/** Looks up genres for books that arrived without any (e.g. plain Goodreads exports). */
export async function fetchEnrichment(
  entries: ReadingHistoryEntry[],
): Promise<Map<string, Enrichment>> {
  const pending = [
    ...new Map(
      entries
        .filter((entry) => entry.subjects.length === 0)
        .map((entry) => [keyOf(entry.title), entry]),
    ).values(),
  ].slice(0, 40);
  const found = new Map<string, Enrichment>();
  if (!pending.length) return found;
  try {
    const response = await fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ books: pending.map(({ title, author }) => ({ title, author })) }),
    });
    if (!response.ok) return found;
    const { results } = (await response.json()) as { results: Enrichment[] };
    pending.forEach((entry, index) => {
      if (results[index]?.subjects?.length) found.set(keyOf(entry.title), results[index]);
    });
  } catch {
    // Enrichment is best-effort; the DNA still uses titles and any tags in the file.
  }
  return found;
}

export function applyEnrichment(
  entries: ReadingHistoryEntry[],
  found: Map<string, Enrichment>,
): ReadingHistoryEntry[] {
  return entries.map((entry) => {
    const extra = found.get(keyOf(entry.title));
    return extra && entry.subjects.length === 0
      ? { ...entry, subjects: extra.subjects, pageCount: entry.pageCount ?? extra.pageCount }
      : entry;
  });
}
