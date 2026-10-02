import type { ReadingFormat, ReadingHistoryEntry } from "@/app/lib/reader-data";

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pageCountValue(value: unknown): number | undefined {
  const pages = Number(typeof value === "string" ? value.replace(/[^\d]/g, "") : value);
  return Number.isInteger(pages) && pages > 0 && pages < 10000 ? pages : undefined;
}

/** Maps Goodreads/StoryGraph-style binding names to reading formats. */
function formatValues(value: unknown): ReadingFormat[] | undefined {
  const text = (Array.isArray(value) ? value.join(" ") : stringValue(value)).toLowerCase();
  const formats: ReadingFormat[] = [];
  if (/audio/.test(text)) formats.push("Audiobook");
  if (/kindle|e-?book|digital/.test(text)) formats.push("Ebook");
  if (
    /paperback|hardcover|hardback|mass market|board|print|physical|book/.test(
      text.replace(/e-?book/g, ""),
    )
  ) {
    formats.push("Print");
  }
  return formats.length ? formats : undefined;
}

/** Maps Goodreads "Exclusive Shelf" / StoryGraph "Read Status" values to a shelf. */
function shelfValue(value: unknown): ReadingHistoryEntry["shelf"] {
  const text = stringValue(value).toLowerCase();
  if (!text) return undefined;
  if (/to[- ]?read|want|tbr|wishlist/.test(text)) return "tbr";
  if (/currently|reading|did[- ]?not|dnf|abandon|paused/.test(text)) return "skipped";
  if (/\bread\b|finished|completed/.test(text)) return "read";
  return undefined;
}

const READ_STATUS_SHELVES = new Set(["read", "to-read", "currently-reading", "did-not-finish"]);

/** Drops status shelves and Goodreads' "(#12)" position suffixes. */
function cleanShelves(subjects: string[]): string[] {
  return subjects
    .map((subject) => subject.replace(/\s*\(#\d+\)$/, "").trim())
    .filter((subject) => subject && !READ_STATUS_SHELVES.has(subject.toLowerCase()));
}

function splitSubjects(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(splitSubjects).filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(/[;|,]/)
    .map((subject) => subject.trim())
    .filter(Boolean);
}

export function parseReadingList(fileName: string, text: string): ReadingHistoryEntry[] {
  if (fileName.toLowerCase().endsWith(".json")) {
    const parsed: unknown = JSON.parse(text);
    const rows = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && "books" in parsed && Array.isArray(parsed.books)
        ? parsed.books
        : [];
    return rows.flatMap((row): ReadingHistoryEntry[] => {
      if (!row || typeof row !== "object") return [];
      const record = row as Record<string, unknown>;
      const title = stringValue(record.title ?? record.Title ?? record.name);
      return title
        ? [
            {
              title,
              author: stringValue(record.author ?? record.authors ?? record.Author) || undefined,
              subjects: splitSubjects(record.subjects ?? record.genres ?? record.tags),
              pageCount: pageCountValue(record.pages ?? record.pageCount ?? record.numberOfPages),
              formats: formatValues(record.format ?? record.formats ?? record.binding),
              shelf: shelfValue(record.status ?? record.shelf ?? record["Exclusive Shelf"]),
            },
          ]
        : [];
    });
  }

  const rows = text.split(/\r?\n/).filter((row) => row.trim());
  if (rows.length < 2) return [];
  const headers = parseCsvRow(rows[0]).map((header) => header.trim().toLowerCase());
  const titleIndex = headers.findIndex((header) =>
    ["title", "book title", "name"].includes(header),
  );
  if (titleIndex < 0) throw new Error("CSV needs a Title, Book Title, or Name column.");
  const authorIndex = headers.findIndex((header) => header.includes("author"));
  const subjectIndexes = headers.flatMap((header, index) =>
    /subject|genre|tag|shelves|mood|^pace$/.test(header) ? [index] : [],
  );
  const pagesIndex = headers.findIndex((header) => /pages/.test(header));
  const formatIndex = headers.findIndex((header) =>
    ["binding", "format", "book format"].includes(header),
  );
  const shelfIndex = headers.findIndex((header) =>
    ["exclusive shelf", "read status", "status", "shelf"].includes(header),
  );

  return rows.slice(1).flatMap((row): ReadingHistoryEntry[] => {
    const values = parseCsvRow(row);
    const title = values[titleIndex]?.trim() ?? "";
    return title
      ? [
          {
            title,
            author: authorIndex >= 0 ? values[authorIndex]?.trim() || undefined : undefined,
            subjects: cleanShelves(subjectIndexes.flatMap((at) => splitSubjects(values[at]))),
            pageCount: pagesIndex >= 0 ? pageCountValue(values[pagesIndex]) : undefined,
            formats: formatIndex >= 0 ? formatValues(values[formatIndex]) : undefined,
            shelf: shelfIndex >= 0 ? shelfValue(values[shelfIndex]) : undefined,
          },
        ]
      : [];
  });
}

function parseCsvRow(row: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value);
  return values;
}

export type SortedImport = {
  history: ReadingHistoryEntry[];
  tbr: ReadingHistoryEntry[];
  skipped: number;
  autoSorted: boolean;
};

/** Files with a shelf/status column are split automatically; others use the chosen list. */
export function sortImportedBooks(
  entries: ReadingHistoryEntry[],
  fallback: "history" | "tbr",
): SortedImport {
  const autoSorted = entries.some((entry) => entry.shelf);
  const result: SortedImport = { history: [], tbr: [], skipped: 0, autoSorted };
  for (const { shelf, ...entry } of entries) {
    if (autoSorted && shelf === "skipped") {
      result.skipped += 1;
    } else if (autoSorted && shelf) {
      result[shelf === "read" ? "history" : "tbr"].push(entry);
    } else {
      result[fallback].push(entry);
    }
  }
  return result;
}

export function importSummary({ history, tbr, skipped, autoSorted }: SortedImport): string {
  const parts = [
    tbr.length ? `${tbr.length} to your TBR` : "",
    history.length ? `${history.length} to your reading history` : "",
  ].filter(Boolean);
  const sorted = autoSorted ? " Sorted automatically by the file’s read status." : "";
  const skippedNote = skipped
    ? ` ${skipped} currently-reading or unfinished books were skipped.`
    : "";
  return `${tbr.length + history.length} books added: ${parts.join(" and ")}.${sorted}${skippedNote}`;
}
