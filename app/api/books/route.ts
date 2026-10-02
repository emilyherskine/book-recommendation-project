import { NextRequest } from "next/server";
import { genreCatalog, modeSearchTerms, readingModes, type OpenLibraryBook, type ReadingMode } from "@/app/lib/reader-data";
import { searchOpenLibrary } from "@/app/lib/open-library";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;
const MAX_OFFSET = 1000;
const MINOR_WORDS = new Set(["and", "the", "for", "with", "from", "your", "book", "books", "mystery", "mysteries"]);

function boundedInteger(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? Math.min(parsed, max) : fallback;
}

function termsFrom(value: string | null): string[] {
  return (value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !MINOR_WORDS.has(term))
    .slice(0, 12);
}

function rankForReader(
  books: OpenLibraryBook[],
  themeTerms: string[],
  mode: ReadingMode,
  profileTerms: string[],
  searchTerms: string[],
): OpenLibraryBook[] {
  const moodTerms = termsFrom(modeSearchTerms[mode]);
  return books
    .map((book) => {
      const searchable = [book.title, ...book.authors, ...book.subjects, book.firstSentence ?? ""]
        .join(" ")
        .toLowerCase();
      const moodMatches = moodTerms.filter((term) => searchable.includes(term));
      const themeMatches = themeTerms.filter((term) => searchable.includes(term));
      const profileMatches = profileTerms.filter((term) => searchable.includes(term));
      const searchMatches = searchTerms.filter((term) => searchable.includes(term));
      const reasons = [
        ...themeMatches.slice(0, 2).map((term) => `Fits your theme: ${term}`),
        ...moodMatches.slice(0, 2).map((term) => `Your ${mode.toLowerCase()} mood: ${term}`),
        ...profileMatches.slice(0, 2).map((term) => `Fits your reader DNA: ${term}`),
        ...searchMatches.slice(0, 2).map((term) => `Matches your search: ${term}`),
      ];
      return {
        ...book,
        recommendationScore: themeMatches.length * 5 + moodMatches.length * 2 + profileMatches.length * 2 + searchMatches.length * 4 + (book.coverUrl ? 1 : 0),
        recommendationReasons: reasons.length ? reasons : ["A mystery selection to broaden your reading profile"],
      };
    })
    .sort((first, second) => (second.recommendationScore ?? 0) - (first.recommendationScore ?? 0));
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const modeParam = params.get("mode") as ReadingMode | null;
  if (!modeParam || !readingModes.some(({ name }) => name === modeParam)) {
    return Response.json({ error: "Choose a valid mystery mood." }, { status: 400 });
  }

  const userQuery = (params.get("q") ?? "").trim().slice(0, 120);
  const selectedGenres = [...new Set(params.getAll("genre").map((genre) => genre.trim()).filter(Boolean))].slice(0, 12);
  const selectedGenreOptions = selectedGenres.flatMap((name) => {
    const known = genreCatalog.find((genre) => genre.name.toLowerCase() === name.toLowerCase());
    return known ? [known] : [{ name, query: name, terms: termsFrom(name), group: "Fiction" as const }];
  });
  const genreTerms = [...new Set(selectedGenreOptions.flatMap((genre) => [...genre.terms, ...termsFrom(genre.name)]))];
  const genreQueryTerms = selectedGenreOptions.flatMap((genre) =>
    genre.field ? [`${genre.field}:${genre.query}`] : termsFrom(genre.name),
  );
  const profileTerms = [params.get("mood"), params.get("pace"), params.get("setting"), params.get("favorites")]
    .flatMap(termsFrom);
  const limit = boundedInteger(params.get("limit"), DEFAULT_LIMIT, MAX_LIMIT) || DEFAULT_LIMIT;
  const offset = boundedInteger(params.get("offset"), 0, MAX_OFFSET);

  try {
    const broadQuery = "fiction OR romance OR fantasy OR mystery OR thriller OR horror";
    const genreQuery = genreQueryTerms.length ? [...new Set(genreQueryTerms)].join(" OR ") : broadQuery;
    let result = await searchOpenLibrary(
      userQuery ? `${genreQuery} AND ${userQuery}` : genreQuery,
      offset,
      limit,
    );
    if (result.items.length === 0 && userQuery) {
      result = await searchOpenLibrary(genreQuery, offset, limit);
    }
    if (result.items.length === 0 && selectedGenreOptions.length) {
      result = await searchOpenLibrary(broadQuery, offset, limit);
    }
    const rankingTerms = selectedGenreOptions.length
      ? genreTerms
      : [...genreTerms, "mystery", "fantasy", "romance", "thriller", "gothic", "horror", "fiction"];
    result.items = rankForReader(result.items, rankingTerms, modeParam, profileTerms, termsFrom(userQuery));
    result.items = result.items.slice(0, Math.min(12, result.items.length));
    for (let index = result.items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [result.items[index], result.items[randomIndex]] = [result.items[randomIndex], result.items[index]];
    }
    return Response.json(result, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("Open Library search failed", error);
    return Response.json(
      { error: "Book search is temporarily unavailable. Please try again shortly." },
      { status: 502 },
    );
  }
}