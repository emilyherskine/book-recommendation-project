import type { ReadingHistoryEntry } from "@/app/lib/reader-data";

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function splitSubjects(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(splitSubjects).filter(Boolean);
  if (typeof value !== "string") return [];
  return value.split(/[;|]/).map((subject) => subject.trim()).filter(Boolean);
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
      return title ? [{
        title,
        author: stringValue(record.author ?? record.authors ?? record.Author) || undefined,
        subjects: splitSubjects(record.subjects ?? record.genres ?? record.tags),
      }] : [];
    });
  }

  const rows = text.split(/\r?\n/).filter((row) => row.trim());
  if (rows.length < 2) return [];
  const headers = parseCsvRow(rows[0]).map((header) => header.trim().toLowerCase());
  const titleIndex = headers.findIndex((header) => ["title", "book title", "name"].includes(header));
  if (titleIndex < 0) throw new Error("CSV needs a Title, Book Title, or Name column.");
  const authorIndex = headers.findIndex((header) => header.includes("author"));
  const subjectIndex = headers.findIndex((header) => /subject|genre|tag/.test(header));

  return rows.slice(1).flatMap((row): ReadingHistoryEntry[] => {
    const values = parseCsvRow(row);
    const title = values[titleIndex]?.trim() ?? "";
    return title ? [{
      title,
      author: authorIndex >= 0 ? values[authorIndex]?.trim() || undefined : undefined,
      subjects: subjectIndex >= 0 ? splitSubjects(values[subjectIndex]) : [],
    }] : [];
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