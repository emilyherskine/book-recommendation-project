import { parseReadingList } from "./reading-list";

describe("parseReadingList", () => {
  it("parses CSV with quoted fields and subjects", () => {
    const csv = 'Title,Author,Genres\n"Rebecca, A Novel",Daphne du Maurier,gothic;mystery\n';
    expect(parseReadingList("tbr.csv", csv)).toEqual([
      { title: "Rebecca, A Novel", author: "Daphne du Maurier", subjects: ["gothic", "mystery"] },
    ]);
  });

  it("rejects CSV files without a title column", () => {
    expect(() => parseReadingList("x.csv", "Foo,Bar\n1,2")).toThrow(/Title/);
  });

  it("returns an empty list for header-only CSV", () => {
    expect(parseReadingList("x.csv", "Title")).toEqual([]);
  });

  it("parses JSON arrays and { books } objects, skipping invalid rows", () => {
    const rows = [{ title: "Dracula", authors: "Bram Stoker" }, 5, { title: " " }];
    const expected = [{ title: "Dracula", author: "Bram Stoker", subjects: [] }];
    expect(parseReadingList("a.json", JSON.stringify(rows))).toEqual(expected);
    expect(parseReadingList("a.json", JSON.stringify({ books: rows }))).toEqual(expected);
  });
});

describe("parseReadingList preferences data", () => {
  it("reads page counts and formats from Goodreads-style columns", () => {
    const csv =
      "Title,Number of Pages,Binding\nDracula,418,Kindle Edition\nRebecca,380,Audible Audio\n";
    expect(parseReadingList("g.csv", csv)).toMatchObject([
      { title: "Dracula", pageCount: 418, formats: ["Ebook"] },
      { title: "Rebecca", pageCount: 380, formats: ["Audiobook"] },
    ]);
  });

  it("reads page counts and formats from JSON", () => {
    const rows = [{ title: "Emma", pages: 474, format: "Paperback" }];
    expect(parseReadingList("a.json", JSON.stringify(rows))).toMatchObject([
      { pageCount: 474, formats: ["Print"] },
    ]);
  });
});

describe("shelf sorting", () => {
  const goodreads = [
    "Title,Author,Exclusive Shelf",
    "Dracula,Bram Stoker,read",
    "Rebecca,du Maurier,to-read",
    "Emma,Austen,currently-reading",
  ].join("\n");

  it("splits a Goodreads export into read and TBR automatically", async () => {
    const { sortImportedBooks, importSummary } = await import("./reading-list");
    const sorted = sortImportedBooks(parseReadingList("g.csv", goodreads), "tbr");
    expect(sorted.history.map((book) => book.title)).toEqual(["Dracula"]);
    expect(sorted.tbr.map((book) => book.title)).toEqual(["Rebecca"]);
    expect(sorted.skipped).toBe(1);
    expect(sorted.history[0]).not.toHaveProperty("shelf");
    expect(importSummary(sorted)).toContain("Sorted automatically");
  });

  it("uses the chosen list when a file has no read status", async () => {
    const { sortImportedBooks } = await import("./reading-list");
    const sorted = sortImportedBooks(parseReadingList("x.csv", "Title\nDracula"), "history");
    expect(sorted.history).toHaveLength(1);
    expect(sorted.tbr).toHaveLength(0);
  });
});

describe("genre-bearing columns", () => {
  it("reads Goodreads bookshelves and StoryGraph moods, dropping status shelves", () => {
    const csv = [
      "Title,Bookshelves,Moods,Pace",
      '"Rebecca","gothic, to-read, mystery (#2)","dark, mysterious",slow',
    ].join("\n");
    expect(parseReadingList("x.csv", csv)[0].subjects).toEqual([
      "gothic",
      "mystery",
      "dark",
      "mysterious",
      "slow",
    ]);
  });
});
