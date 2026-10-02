import { NextRequest } from "next/server";
import { searchOpenLibrary } from "@/app/lib/open-library";

export const runtime = "nodejs";

const MAX_BOOKS = 40;
const requests = new Map<string, number[]>();

function allowed(key: string): boolean {
  const now = Date.now();
  const recent = (requests.get(key) ?? []).filter((time) => now - time < 10 * 60 * 1000);
  requests.set(key, [...recent, now]);
  return recent.length < 10;
}

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/["\\]/g, " ").trim().slice(0, max) : "";

export async function POST(request: NextRequest) {
  const requester = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(requester)) {
    return Response.json({ error: "Please wait a moment and try again." }, { status: 429 });
  }
  let books: Array<{ title: string; author: string }>;
  try {
    const body = (await request.json()) as { books?: unknown };
    if (!Array.isArray(body.books)) throw new Error("Invalid request.");
    books = body.books
      .slice(0, MAX_BOOKS)
      .map((book) => ({
        title: clean((book as { title?: unknown })?.title, 160),
        author: clean((book as { author?: unknown })?.author, 100),
      }))
      .filter((book) => book.title);
  } catch {
    return Response.json({ error: "Send a list of books." }, { status: 400 });
  }

  const results = new Array<{ subjects: string[]; pageCount?: number }>(books.length).fill({
    subjects: [],
  });
  let next = 0;
  async function worker() {
    while (next < books.length) {
      const index = next++;
      const { title, author } = books[index];
      try {
        const query = `title:"${title}"${author ? ` AND author:"${author}"` : ""}`;
        const [match] = (await searchOpenLibrary(query, 0, 1)).items;
        if (match)
          results[index] = { subjects: match.subjects.slice(0, 12), pageCount: match.pageCount };
      } catch {
        // One failed lookup shouldn't sink the rest.
      }
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));
  return Response.json({ results });
}
