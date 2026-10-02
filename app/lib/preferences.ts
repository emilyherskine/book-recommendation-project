import type { BookLength, ReadingFormat, ReadingPreferences } from "@/app/lib/reader-data";

export type PreferenceCandidate = {
  pageCount?: number;
  subjects: string[];
  formats?: ReadingFormat[];
  ebookAccess?: string;
};

export type PreferenceFit = { score: number; reasons: string[]; excluded: boolean };

const LENGTH_RANGES: Record<Exclude<BookLength, "Any length">, [number, number]> = {
  "Short (<250 pages)": [0, 249],
  "Medium (250-450 pages)": [250, 450],
  "Long (450+ pages)": [451, Infinity],
};

const pepperScore = [4, 2, 0, -4, -8];

/** Estimates heat from subject tags; undefined when the tags say nothing about it. */
export function estimateSpice(subjects: string[]): number | undefined {
  const text = subjects.join(" ").toLowerCase();
  if (/erotic|erotica|explicit|smut|bdsm/.test(text)) return 5;
  if (/steamy|spicy|dark romance|sensual/.test(text)) return 4;
  if (/clean|wholesome|sweet romance|christian|inspirational|cozy/.test(text)) return 1;
  if (/fade to black|closed door|slow burn/.test(text)) return 2;
  if (/romance|romantic|love stor/.test(text)) return 3;
  return undefined;
}

function lengthFit(
  pageCount: number | undefined,
  length: BookLength,
): { score: number; reason?: string; excluded?: boolean } {
  if (length === "Any length" || !pageCount) return { score: 0 };
  const [min, max] = LENGTH_RANGES[length];
  return pageCount >= min && pageCount <= max
    ? { score: 6, reason: `Fits your length preference: ${pageCount} pages` }
    : { score: -6, excluded: true };
}

function formatFit(
  candidate: PreferenceCandidate,
  format: ReadingFormat,
): { score: number; reason?: string } {
  if (format === "Any format") return { score: 0 };
  if (candidate.formats?.length) {
    return candidate.formats.includes(format)
      ? { score: 4, reason: `On your list as ${format === "Print" ? "a physical book" : format}` }
      : { score: -3 };
  }
  if (format === "Ebook") {
    if (candidate.ebookAccess === "borrowable" || candidate.ebookAccess === "public") {
      return { score: 3, reason: "Available to read as an ebook" };
    }
    return candidate.ebookAccess === "no_ebook" ? { score: -3 } : { score: 0 };
  }
  if (format === "Audiobook" && /audio ?book|audible/i.test(candidate.subjects.join(" "))) {
    return { score: 4, reason: "Available as an audiobook" };
  }
  return { score: 0 };
}

export function scoreForPreferences(
  candidate: PreferenceCandidate,
  preferences: ReadingPreferences,
): PreferenceFit {
  const length = lengthFit(candidate.pageCount, preferences.length);
  const format = formatFit(candidate, preferences.format);
  const estimated = estimateSpice(candidate.subjects);
  const spiceDistance =
    estimated === undefined ? undefined : Math.abs(estimated - preferences.spiceLevel);
  const spiceScore = spiceDistance === undefined ? 0 : pepperScore[spiceDistance];

  const reasons = [
    ...(length.reason ? [length.reason] : []),
    ...(format.reason ? [format.reason] : []),
    ...(spiceDistance !== undefined && spiceDistance <= 1
      ? [`Heat level suits your ${"🌶".repeat(preferences.spiceLevel)} preference`]
      : []),
  ];
  return {
    score: length.score + format.score + spiceScore,
    reasons,
    excluded: Boolean(length.excluded) || (spiceDistance !== undefined && spiceDistance >= 3),
  };
}

/** Drops books that clash with hard preferences, unless that would leave too few. */
export function preferredPool<T>(items: T[], fitOf: (item: T) => PreferenceFit, minimum = 1): T[] {
  const matching = items.filter((item) => !fitOf(item).excluded);
  return matching.length >= minimum ? matching : items;
}
